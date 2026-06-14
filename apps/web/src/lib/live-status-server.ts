import type { SessionType } from "@pitwall/types";
import type { SessionInfo } from "@pitwall/types";
import { getActiveWeekendRace, getNextRace } from "@/lib/data/current/season";
import { CURRENT_SEASON } from "@/lib/config";
import { readLiveKv } from "@/lib/redis";
import type { LiveSessionStatus } from "@/lib/live-status-types";
import { isLiveSessionType, isSessionLive, mapOpenF1SessionType, secondsUntil } from "@/lib/session-utils";
import {
  fetchJolpicaRaceForWeekend,
  findLiveSessionFromJolpicaCalendar,
  findUpcomingJolpicaWeekend,
  findLiveScheduledSession,
  findNextScheduledSession,
  type ScheduledSession,
} from "@/lib/jolpica-schedule";
import {
  fetchOpenF1LatestSession,
  mapOpenF1CircuitRef,
  type OpenF1Session,
} from "@/lib/openf1-sessions";

type WeekendRace = NonNullable<Awaited<ReturnType<typeof getActiveWeekendRace>>>;

function statusFromRedisSession(
  session: SessionInfo,
  calendarRace: WeekendRace | null
): LiveSessionStatus | null {
  if (!isSessionLive(session)) return null;

  const sessionType = session.sessionType;
  if (!isLiveSessionType(sessionType)) return null;

  const circuitRef = calendarRace?.circuit.circuit_ref ?? session.circuitName;

  return {
    isLive: true,
    sessionType,
    circuitName: session.circuitName,
    circuitRef,
    meetingName: session.meetingName || calendarRace?.race_name || null,
    sessionName: session.sessionName,
    countdownSeconds: null,
    weekendActive: true,
    mode: "live",
  };
}

function statusFromScheduledSession(
  session: ScheduledSession,
  calendarRace: WeekendRace | null
): LiveSessionStatus {
  const circuitRef = session.circuitRef || calendarRace?.circuit.circuit_ref || null;
  return {
    isLive: true,
    sessionType: session.sessionType,
    circuitName: circuitRef,
    circuitRef,
    meetingName: session.meetingName || calendarRace?.race_name || null,
    sessionName: session.sessionName,
    countdownSeconds: null,
    weekendActive: true,
    mode: "live",
  };
}

function statusFromOpenF1Session(
  openF1Session: OpenF1Session,
  calendarRace: WeekendRace | null
): LiveSessionStatus | null {
  const sessionType = mapOpenF1SessionType(openF1Session.session_name, openF1Session.session_type);
  if (!sessionType || !isLiveSessionType(sessionType) || !isSessionLive(openF1Session)) {
    return null;
  }

  const circuitRef =
    (calendarRace?.circuit.circuit_ref ??
      mapOpenF1CircuitRef(openF1Session.circuit_short_name)) ||
    null;

  return {
    isLive: true,
    sessionType,
    circuitName: circuitRef,
    circuitRef,
    meetingName: calendarRace?.race_name ?? openF1Session.location ?? null,
    sessionName: openF1Session.session_name,
    countdownSeconds: null,
    weekendActive: true,
    mode: "live",
  };
}

async function resolveLiveFromJolpica(
  weekendRace: WeekendRace
): Promise<LiveSessionStatus | null> {
  const jolpica = await fetchJolpicaRaceForWeekend(
    weekendRace.season_year,
    weekendRace.circuit.circuit_ref,
    weekendRace.race_date
  );
  if (!jolpica) return null;

  const liveSession = findLiveScheduledSession(jolpica.sessions);
  if (liveSession) return statusFromScheduledSession(liveSession, weekendRace);
  return null;
}

function resolveLiveFromDbSessions(weekendRace: WeekendRace): LiveSessionStatus | null {
  for (const session of weekendRace.sessions) {
    const sessionType = session.session_type as SessionType;
    if (!isLiveSessionType(sessionType)) continue;
    if (!isSessionLive({ ...session, sessionType })) continue;

    return {
      isLive: true,
      sessionType,
      circuitName: weekendRace.circuit.circuit_ref,
      circuitRef: weekendRace.circuit.circuit_ref,
      meetingName: weekendRace.race_name,
      sessionName: session.session_name,
      countdownSeconds: null,
      weekendActive: true,
      mode: "live",
    };
  }
  return null;
}

function weekendStatus(
  weekendRace: WeekendRace,
  upcomingSessionName: string | null,
  countdownSeconds: number | null
): LiveSessionStatus {
  return {
    isLive: false,
    sessionType: null,
    circuitName: weekendRace.circuit.circuit_ref,
    circuitRef: weekendRace.circuit.circuit_ref,
    meetingName: weekendRace.race_name,
    sessionName: upcomingSessionName,
    countdownSeconds,
    weekendActive: true,
    mode: "weekend",
  };
}

export async function resolveLiveSessionStatus(): Promise<LiveSessionStatus> {
  const seasonYear = CURRENT_SEASON;
  const [redisSession, openF1Result, weekendRace, nextRace] = await Promise.all([
    readLiveKv<SessionInfo>("live:session:info"),
    fetchOpenF1LatestSession(),
    getActiveWeekendRace(seasonYear),
    getNextRace(seasonYear),
  ]);

  const fromRedis = redisSession ? statusFromRedisSession(redisSession, weekendRace) : null;
  if (fromRedis) return fromRedis;

  if (openF1Result.kind === "session") {
    const fromOpenF1 = statusFromOpenF1Session(openF1Result.session, weekendRace);
    if (fromOpenF1) return fromOpenF1;
  }

  if (weekendRace) {
    const fromJolpica = await resolveLiveFromJolpica(weekendRace);
    if (fromJolpica) return fromJolpica;

    const fromDb = resolveLiveFromDbSessions(weekendRace);
    if (fromDb) return fromDb;

    // OpenF1 blocks unauthenticated requests during live sessions — treat as live
    // when Jolpica schedule confirms an in-progress session.
    if (openF1Result.kind === "live-restricted") {
      const jolpica = await fetchJolpicaRaceForWeekend(
        weekendRace.season_year,
        weekendRace.circuit.circuit_ref,
        weekendRace.race_date
      );
      const liveSession = jolpica ? findLiveScheduledSession(jolpica.sessions) : null;
      if (liveSession) return statusFromScheduledSession(liveSession, weekendRace);

      // Restricted API + active weekend: assume live with best-known circuit metadata.
      return {
        isLive: true,
        sessionType: null,
        circuitName: weekendRace.circuit.circuit_ref,
        circuitRef: weekendRace.circuit.circuit_ref,
        meetingName: weekendRace.race_name,
        sessionName: null,
        countdownSeconds: null,
        weekendActive: true,
        mode: "live",
      };
    }

    const jolpica = await fetchJolpicaRaceForWeekend(
      weekendRace.season_year,
      weekendRace.circuit.circuit_ref,
      weekendRace.race_date
    );
    const upcoming =
      jolpica?.sessions && findNextScheduledSession(jolpica.sessions);
    if (upcoming) {
      return weekendStatus(
        weekendRace,
        upcoming.sessionName,
        secondsUntil(new Date(upcoming.dateStart))
      );
    }

    const upcomingDb = weekendRace.sessions.find((s) => new Date(s.date_start) > new Date());
    return weekendStatus(
      weekendRace,
      upcomingDb?.session_name ?? null,
      upcomingDb ? secondsUntil(new Date(upcomingDb.date_start)) : null
    );
  }

  // DB calendar incomplete — Jolpica is authoritative for session times.
  if (openF1Result.kind === "live-restricted" || openF1Result.kind === "session") {
    const jolpicaLive = await findLiveSessionFromJolpicaCalendar(seasonYear);
    if (jolpicaLive) {
      return statusFromScheduledSession(jolpicaLive.session, null);
    }
  }

  const jolpicaWeekend = await findUpcomingJolpicaWeekend(seasonYear);
  if (jolpicaWeekend) {
    const { race, nextSession } = jolpicaWeekend;
    return {
      isLive: false,
      sessionType: null,
      circuitName: race.Circuit.circuitId,
      circuitRef: race.Circuit.circuitId,
      meetingName: race.raceName,
      sessionName: nextSession.sessionName,
      countdownSeconds: secondsUntil(new Date(nextSession.dateStart)),
      weekendActive: true,
      mode: "weekend",
    };
  }

  const calendarRace = nextRace;
  const circuitRef = calendarRace?.circuit.circuit_ref ?? null;
  const nextSession = nextRace?.sessions.find((s) => new Date(s.date_start) > new Date());
  return {
    isLive: false,
    sessionType: null,
    circuitName: circuitRef,
    circuitRef,
    meetingName: nextRace?.race_name ?? null,
    sessionName: nextSession?.session_name ?? null,
    countdownSeconds: nextSession
      ? secondsUntil(new Date(nextSession.date_start))
      : nextRace
        ? secondsUntil(new Date(nextRace.race_date))
        : null,
    weekendActive: false,
    mode: "off-week",
  };
}

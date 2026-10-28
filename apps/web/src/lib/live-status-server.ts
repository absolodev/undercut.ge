import type { SessionType } from "@pitwall/types";
import type { SessionInfo } from "@pitwall/types";
import { raceStartInstant } from "@pitwall/utils";
import { getActiveWeekendRace, getNextRace } from "@/lib/data/current/season";
import { CURRENT_SEASON } from "@/lib/config";
import { readLiveKv } from "@/lib/redis";
import type { LiveSessionStatus } from "@/lib/live-status-types";
import { isLiveSessionType, isSessionLive, mapOpenF1SessionType, secondsUntil } from "@/lib/session-utils";
import {
  fetchJolpicaSeasonRaces,
  findActiveJolpicaWeekend,
  findLiveSessionInRaces,
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

function offWeekStatus(
  nextRace: Awaited<ReturnType<typeof getNextRace>>
): LiveSessionStatus {
  const circuitRef = nextRace?.circuit.circuit_ref ?? null;
  const raceStart = nextRace ? raceStartInstant(nextRace) : null;
  return {
    isLive: false,
    sessionType: null,
    circuitName: circuitRef,
    circuitRef,
    meetingName: nextRace?.race_name ?? null,
    sessionName: null,
    countdownSeconds: raceStart && raceStart.getTime() > Date.now() ? secondsUntil(raceStart) : null,
    weekendActive: false,
    mode: "off-week",
  };
}

export async function resolveLiveSessionStatus(): Promise<LiveSessionStatus> {
  const seasonYear = CURRENT_SEASON;
  const now = new Date();
  const [redisSession, openF1Result, weekendRace, nextRace, jolpicaRaces] = await Promise.all([
    readLiveKv<SessionInfo>("live:session:info"),
    fetchOpenF1LatestSession(),
    getActiveWeekendRace(seasonYear),
    getNextRace(seasonYear),
    fetchJolpicaSeasonRaces(seasonYear),
  ]);

  const scheduleKnown = jolpicaRaces !== null;
  const scheduledLive = jolpicaRaces ? findLiveSessionInRaces(jolpicaRaces) : null;

  // A session is live only while start <= now <= end + buffer. The OpenF1
  // "live restricted" response is not enough on its own.
  if (scheduledLive) {
    return statusFromScheduledSession(scheduledLive.session, weekendRace);
  }

  if (!scheduleKnown) {
    const fromRedis = redisSession ? statusFromRedisSession(redisSession, weekendRace) : null;
    if (fromRedis) return fromRedis;

    if (openF1Result.kind === "session") {
      const fromOpenF1 = statusFromOpenF1Session(openF1Result.session, weekendRace);
      if (fromOpenF1) return fromOpenF1;
    }

    if (weekendRace) {
      const fromDb = resolveLiveFromDbSessions(weekendRace);
      if (fromDb) return fromDb;
    }
  }

  if (weekendRace) {
    const upcoming = [...weekendRace.sessions]
      .sort((left, right) => new Date(left.date_start).getTime() - new Date(right.date_start).getTime())
      .find((session) => new Date(session.date_start).getTime() > now.getTime());
    return weekendStatus(
      weekendRace,
      upcoming?.session_name ?? null,
      upcoming ? secondsUntil(new Date(upcoming.date_start)) : secondsUntil(raceStartInstant(weekendRace))
    );
  }

  if (jolpicaRaces) {
    const jolpicaWeekend = findActiveJolpicaWeekend(jolpicaRaces, now);
    if (jolpicaWeekend) {
      const { race, nextSession } = jolpicaWeekend;
      return {
        isLive: false,
        sessionType: null,
        circuitName: race.Circuit.circuitId,
        circuitRef: race.Circuit.circuitId,
        meetingName: race.raceName,
        sessionName: nextSession?.sessionName ?? null,
        countdownSeconds: nextSession ? secondsUntil(new Date(nextSession.dateStart)) : null,
        weekendActive: true,
        mode: "weekend",
      };
    }
  }

  return offWeekStatus(nextRace);
}

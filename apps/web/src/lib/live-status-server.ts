import type { SessionType } from "@pitwall/types";
import type { SessionInfo } from "@pitwall/types";
import { getActiveWeekendRace, getNextRace } from "@/lib/data/current/season";
import { CURRENT_SEASON } from "@/lib/config";
import { readLiveKv } from "@/lib/redis";
import type { LiveSessionStatus } from "@/lib/live-status-types";
import { isLiveSessionType, isSessionLive, mapOpenF1SessionType, secondsUntil } from "@/lib/session-utils";

interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type?: string;
  date_start: string;
  date_end: string | null;
  circuit_short_name?: string;
  location?: string;
  country_name?: string;
}

async function fetchOpenF1LatestSession(): Promise<OpenF1Session | null> {
  try {
    const res = await fetch("https://api.openf1.org/v1/sessions?session_key=latest", {
      cache: "no-store",
    });
    const data = (await res.json()) as OpenF1Session[] | { detail?: string };
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0];
  } catch {
    return null;
  }
}

function statusFromRedisSession(
  session: SessionInfo,
  calendarRace: Awaited<ReturnType<typeof getActiveWeekendRace>>
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

export async function resolveLiveSessionStatus(): Promise<LiveSessionStatus> {
  const seasonYear = CURRENT_SEASON;
  const [redisSession, openF1Session, weekendRace, nextRace] = await Promise.all([
    readLiveKv<SessionInfo>("live:session:info"),
    fetchOpenF1LatestSession(),
    getActiveWeekendRace(seasonYear),
    getNextRace(seasonYear),
  ]);

  const fromRedis = redisSession ? statusFromRedisSession(redisSession, weekendRace) : null;
  if (fromRedis) return fromRedis;

  const calendarRace = weekendRace ?? nextRace;
  const circuitRef = calendarRace?.circuit.circuit_ref ?? null;
  const circuitName = circuitRef ?? redisSession?.circuitName ?? null;
  const meetingName = calendarRace?.race_name ?? openF1Session?.location ?? null;

  if (openF1Session) {
    const sessionType = mapOpenF1SessionType(openF1Session.session_name, openF1Session.session_type);
    if (sessionType && isLiveSessionType(sessionType) && isSessionLive(openF1Session)) {
      return {
        isLive: true,
        sessionType,
        circuitName,
        circuitRef,
        meetingName,
        sessionName: openF1Session.session_name,
        countdownSeconds: null,
        weekendActive: true,
        mode: "live",
      };
    }
  }

  if (weekendRace) {
    const upcomingSession = weekendRace.sessions.find((s) => new Date(s.date_start) > new Date());
    return {
      isLive: false,
      sessionType: null,
      circuitName,
      circuitRef,
      meetingName: weekendRace.race_name,
      sessionName: upcomingSession?.session_name ?? null,
      countdownSeconds: upcomingSession ? secondsUntil(new Date(upcomingSession.date_start)) : null,
      weekendActive: true,
      mode: "weekend",
    };
  }

  const nextSession = nextRace?.sessions.find((s) => new Date(s.date_start) > new Date());
  return {
    isLive: false,
    sessionType: null,
    circuitName,
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

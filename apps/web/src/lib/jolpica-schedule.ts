import type { SessionType } from "@pitwall/types";
import {
  isLiveSessionType,
  isSessionEnded,
  isSessionLive,
  SESSION_END_BUFFER_MS,
} from "@/lib/session-utils";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

const SESSION_DURATION_MS: Record<SessionType, number> = {
  FP1: 60 * 60 * 1000,
  FP2: 60 * 60 * 1000,
  FP3: 60 * 60 * 1000,
  Q: 60 * 60 * 1000,
  SQ: 45 * 60 * 1000,
  S: 60 * 60 * 1000,
  R: 2 * 60 * 60 * 1000,
};

interface JolpicaTimeSlot {
  date: string;
  time?: string;
}

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: { circuitId: string; circuitName: string };
  FirstPractice?: JolpicaTimeSlot;
  SecondPractice?: JolpicaTimeSlot;
  ThirdPractice?: JolpicaTimeSlot;
  Qualifying?: JolpicaTimeSlot;
  Sprint?: JolpicaTimeSlot;
  SprintQualifying?: JolpicaTimeSlot;
}

export interface ScheduledSession {
  sessionType: SessionType;
  sessionName: string;
  dateStart: string;
  dateEnd: string;
  circuitRef: string;
  meetingName: string;
}

function parseSlot(type: SessionType, name: string, slot?: JolpicaTimeSlot): ScheduledSession | null {
  if (!slot?.date) return null;
  const start = new Date(slot.time ? `${slot.date}T${slot.time}` : `${slot.date}T00:00:00Z`);
  const end = new Date(start.getTime() + SESSION_DURATION_MS[type]);
  return {
    sessionType: type,
    sessionName: name,
    dateStart: start.toISOString(),
    dateEnd: end.toISOString(),
    circuitRef: "",
    meetingName: "",
  };
}

export function parseJolpicaRaceSessions(race: JolpicaRace): ScheduledSession[] {
  const circuitRef = race.Circuit.circuitId;
  const meetingName = race.raceName;
  const slots: Array<ScheduledSession | null> = [
    parseSlot("FP1", "Practice 1", race.FirstPractice),
    parseSlot("FP2", "Practice 2", race.SecondPractice),
    parseSlot("FP3", "Practice 3", race.ThirdPractice),
    parseSlot("SQ", "Sprint Qualifying", race.SprintQualifying),
    parseSlot("S", "Sprint", race.Sprint),
    parseSlot("Q", "Qualifying", race.Qualifying),
    parseSlot("R", "Race", { date: race.date, time: race.time }),
  ];

  return slots
    .filter((s): s is ScheduledSession => s !== null)
    .map((s) => ({ ...s, circuitRef, meetingName }));
}

export function findLiveScheduledSession(sessions: ScheduledSession[]): ScheduledSession | null {
  for (const session of sessions) {
    if (!isLiveSessionType(session.sessionType)) continue;
    if (isSessionLive(session)) return session;
  }
  return null;
}

export function findNextScheduledSession(sessions: ScheduledSession[]): ScheduledSession | null {
  const now = Date.now();
  return sessions.find((s) => new Date(s.dateStart).getTime() > now) ?? null;
}

/** True when every scheduled session has passed its end time (+ buffer). */
export function areAllSessionsEnded(
  sessions: ScheduledSession[],
  bufferMs: number = SESSION_END_BUFFER_MS
): boolean {
  if (sessions.length === 0) return false;
  return sessions.every((s) => isSessionEnded(s, bufferMs));
}

/** Weekend is over once the race session has ended (+ buffer). */
export function isWeekendComplete(sessions: ScheduledSession[]): boolean {
  const race = sessions.find((s) => s.sessionType === "R");
  if (!race) return areAllSessionsEnded(sessions);
  return isSessionEnded(race);
}

function weekendBounds(sessions: ScheduledSession[]): { start: number; end: number } | null {
  if (sessions.length === 0) return null;
  const ordered = [...sessions].sort(
    (left, right) => new Date(left.dateStart).getTime() - new Date(right.dateStart).getTime()
  );
  const first = new Date(ordered[0].dateStart);
  first.setUTCHours(0, 0, 0, 0);
  const race = ordered.find((session) => session.sessionType === "R") ?? ordered[ordered.length - 1];
  const end = new Date(race.dateEnd).getTime() + SESSION_END_BUFFER_MS;
  return { start: first.getTime(), end };
}

export async function fetchJolpicaSeasonRaces(seasonYear: number): Promise<JolpicaRace[] | null> {
  try {
    const res = await fetch(`${JOLPICA_BASE}/${seasonYear}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } };
    return data.MRData?.RaceTable?.Races ?? [];
  } catch {
    return null;
  }
}

export function findLiveSessionInRaces(
  races: JolpicaRace[]
): { race: JolpicaRace; session: ScheduledSession } | null {
  for (const race of races) {
    const live = findLiveScheduledSession(parseJolpicaRaceSessions(race));
    if (live) return { race, session: live };
  }
  return null;
}

/**
 * Active only from the first session's calendar day through the race end.
 * A finished grand prix is never returned, even inside a multi-day lookback.
 */
export function findActiveJolpicaWeekend(
  races: JolpicaRace[],
  now: Date = new Date()
): { race: JolpicaRace; nextSession: ScheduledSession | null } | null {
  const instant = now.getTime();
  for (const race of races) {
    const sessions = parseJolpicaRaceSessions(race);
    if (isWeekendComplete(sessions)) continue;
    const bounds = weekendBounds(sessions);
    if (!bounds || instant < bounds.start || instant > bounds.end) continue;
    return { race, nextSession: findNextScheduledSession(sessions) };
  }
  return null;
}

async function fetchJolpicaRaceTable(seasonYear: number, round?: number): Promise<JolpicaRace | null> {
  try {
    const path = round != null ? `${seasonYear}/${round}.json` : `${seasonYear}.json`;
    const res = await fetch(`${JOLPICA_BASE}/${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } };
    const races = data.MRData?.RaceTable?.Races;
    if (!races?.length) return null;
    return round != null ? races[0] : null;
  } catch {
    return null;
  }
}

export async function fetchJolpicaRaceByRound(
  seasonYear: number,
  round: number
): Promise<{ race: JolpicaRace; sessions: ScheduledSession[] } | null> {
  const race = await fetchJolpicaRaceTable(seasonYear, round);
  if (!race) return null;
  return { race, sessions: parseJolpicaRaceSessions(race) };
}

export async function fetchJolpicaRaceForWeekend(
  seasonYear: number,
  circuitRef: string,
  raceDate: Date,
  round?: number
): Promise<{ race: JolpicaRace; sessions: ScheduledSession[] } | null> {
  try {
    const races = await fetchJolpicaSeasonRaces(seasonYear);
    if (!races) return null;
    const targetDate = raceDate.toISOString().slice(0, 10);

    // Match the round first. A circuit-only fallback attached Mexico's future
    // timetable to the United States row after circuit ids drifted by one round.
    const race =
      (round != null ? races.find((r) => Number(r.round) === round) : undefined) ??
      races.find((r) => r.Circuit.circuitId === circuitRef && r.date === targetDate) ??
      races.find((r) => r.date === targetDate);

    if (!race) return null;
    return { race, sessions: parseJolpicaRaceSessions(race) };
  } catch {
    return null;
  }
}

/** Find any in-progress session from the full season calendar (no DB required). */
export async function findLiveSessionFromJolpicaCalendar(
  seasonYear: number
): Promise<{ race: JolpicaRace; session: ScheduledSession } | null> {
  const races = await fetchJolpicaSeasonRaces(seasonYear);
  if (!races) return null;
  return findLiveSessionInRaces(races);
}

/** Nearest race weekend for preview when the DB calendar has no matching round. */
export async function findUpcomingJolpicaWeekend(
  seasonYear: number
): Promise<{ race: JolpicaRace; nextSession: ScheduledSession } | null> {
  const races = await fetchJolpicaSeasonRaces(seasonYear);
  if (!races) return null;
  const active = findActiveJolpicaWeekend(races);
  if (!active?.nextSession) return null;
  return { race: active.race, nextSession: active.nextSession };
}

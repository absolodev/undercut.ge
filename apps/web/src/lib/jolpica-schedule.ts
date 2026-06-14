import type { SessionType } from "@pitwall/types";
import { isLiveSessionType, isSessionLive } from "@/lib/session-utils";

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
  raceDate: Date
): Promise<{ race: JolpicaRace; sessions: ScheduledSession[] } | null> {
  try {
    const res = await fetch(`${JOLPICA_BASE}/${seasonYear}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } };
    const races = data.MRData?.RaceTable?.Races ?? [];
    const targetDate = raceDate.toISOString().slice(0, 10);

    const race =
      races.find((r) => r.Circuit.circuitId === circuitRef && r.date === targetDate) ??
      races.find((r) => r.Circuit.circuitId === circuitRef) ??
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
  try {
    const res = await fetch(`${JOLPICA_BASE}/${seasonYear}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } };
    const races = data.MRData?.RaceTable?.Races ?? [];

    for (const race of races) {
      const sessions = parseJolpicaRaceSessions(race);
      const live = findLiveScheduledSession(sessions);
      if (live) return { race, session: live };
    }
    return null;
  } catch {
    return null;
  }
}

/** Nearest race weekend for preview/countdown when DB calendar is incomplete. */
export async function findUpcomingJolpicaWeekend(
  seasonYear: number
): Promise<{ race: JolpicaRace; nextSession: ScheduledSession } | null> {
  try {
    const res = await fetch(`${JOLPICA_BASE}/${seasonYear}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } };
    const races = data.MRData?.RaceTable?.Races ?? [];
    const now = Date.now();

    for (const race of races) {
      const raceStart = new Date(race.time ? `${race.date}T${race.time}` : race.date).getTime();
      const windowStart = raceStart - 3 * 24 * 60 * 60 * 1000;
      const windowEnd = raceStart + 24 * 60 * 60 * 1000;
      if (now < windowStart || now > windowEnd) continue;

      const sessions = parseJolpicaRaceSessions(race);
      const next = findNextScheduledSession(sessions);
      if (next) return { race, nextSession: next };
    }
    return null;
  } catch {
    return null;
  }
}

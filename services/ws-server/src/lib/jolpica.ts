import type { SessionInfo, SessionType } from "@pitwall/types";

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

const SESSION_END_BUFFER_MS = 30 * 60 * 1000;

interface JolpicaTimeSlot {
  date: string;
  time?: string;
}

interface JolpicaRace {
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

function parseRaceSessions(race: JolpicaRace): ScheduledSession[] {
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

function resolveSessionEnd(session: {
  dateStart: string;
  dateEnd: string;
  sessionType?: SessionType;
}): Date {
  const start = new Date(session.dateStart);
  const end = new Date(session.dateEnd);
  if (end.getTime() <= start.getTime()) {
    const duration = SESSION_DURATION_MS[session.sessionType ?? "R"];
    return new Date(start.getTime() + duration);
  }
  return end;
}

function isSessionLive(session: {
  dateStart: string;
  dateEnd: string;
  sessionType?: SessionType;
}): boolean {
  const now = Date.now();
  const start = new Date(session.dateStart).getTime();
  if (now < start) return false;
  const end = resolveSessionEnd(session);
  return now <= end.getTime() + SESSION_END_BUFFER_MS;
}

export async function findLiveSessionFromJolpica(
  seasonYear: number
): Promise<ScheduledSession | null> {
  try {
    const res = await fetch(`${JOLPICA_BASE}/${seasonYear}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as { MRData?: { RaceTable?: { Races?: JolpicaRace[] } } };
    const races = data.MRData?.RaceTable?.Races ?? [];

    for (const race of races) {
      for (const session of parseRaceSessions(race)) {
        if (isSessionLive(session)) return session;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function scheduledSessionToSessionInfo(session: ScheduledSession): SessionInfo {
  return {
    sessionKey: 0,
    sessionType: session.sessionType,
    sessionName: session.sessionName,
    meetingName: session.meetingName,
    circuitName: session.circuitRef,
    circuitShortName: session.circuitRef,
    countryName: "",
    dateStart: session.dateStart,
    dateEnd: session.dateEnd,
    totalLaps: session.sessionType === "R" ? 66 : 0,
  };
}

/** Session windows for "what is live / this weekend / next". Times are UTC. */

const SESSION_DURATION_MS: Record<string, number> = {
  FP1: 60 * 60 * 1000,
  FP2: 60 * 60 * 1000,
  FP3: 60 * 60 * 1000,
  Q: 60 * 60 * 1000,
  SQ: 45 * 60 * 1000,
  S: 60 * 60 * 1000,
  R: 2 * 60 * 60 * 1000,
};

/** Grace after the scheduled end. Races often run slightly long. */
export const SESSION_END_BUFFER_MS = 30 * 60 * 1000;

export interface RaceSessionTiming {
  session_type: string;
  date_start: Date | string;
  date_end?: Date | string | null;
}

export interface RaceTiming {
  race_date: Date | string;
  race_time?: Date | string | null;
  sessions?: RaceSessionTiming[];
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function isMidnightUtc(date: Date): boolean {
  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
}

/** Prisma `@db.Time` comes back as a Date on 1970-01-01, or as a `HH:MM:SS` string. */
export function combineRaceDateAndTime(
  raceDate: Date | string,
  raceTime: Date | string | null | undefined
): Date | null {
  if (raceTime == null || raceTime === "") return null;
  const date = asDate(raceDate);
  if (Number.isNaN(date.getTime())) return null;

  if (typeof raceTime === "string") {
    const match = raceTime.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    date.setUTCHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
    return date;
  }

  date.setUTCHours(raceTime.getUTCHours(), raceTime.getUTCMinutes(), raceTime.getUTCSeconds(), 0);
  return date;
}

function raceSession(race: RaceTiming): RaceSessionTiming | undefined {
  return race.sessions?.find((session) => session.session_type === "R");
}

function sessionStart(session: RaceSessionTiming): Date | null {
  const start = asDate(session.date_start);
  return Number.isNaN(start.getTime()) ? null : start;
}

/**
 * End instant for a session. When `date_end` is missing or not after the start
 * (the usual midnight placeholder), apply the session's scheduled duration.
 */
export function resolveTimedSessionEnd(session: RaceSessionTiming): Date | null {
  const start = sessionStart(session);
  if (!start) return null;
  const end = session.date_end ? asDate(session.date_end) : null;
  if (end && !Number.isNaN(end.getTime()) && end.getTime() > start.getTime()) return end;
  const duration = SESSION_DURATION_MS[session.session_type] ?? SESSION_DURATION_MS.R;
  return new Date(start.getTime() + duration);
}

function sessionsAreDateOnlyPlaceholders(race: RaceTiming): boolean {
  const sessions = race.sessions ?? [];
  if (sessions.length === 0) return true;
  const raceDay = asDate(race.race_date).toISOString().slice(0, 10);
  return sessions.every((session) => {
    const start = sessionStart(session);
    if (!start || !isMidnightUtc(start)) return false;
    return start.toISOString().slice(0, 10) === raceDay;
  });
}

export function raceStartInstant(race: RaceTiming): Date {
  const session = raceSession(race);
  const published = combineRaceDateAndTime(race.race_date, race.race_time);
  if (session && !sessionsAreDateOnlyPlaceholders(race)) {
    const start = sessionStart(session);
    if (start) return start;
  }
  if (published) return published;
  const fallback = asDate(race.race_date);
  fallback.setUTCHours(13, 0, 0, 0);
  return fallback;
}

export function raceEndInstant(race: RaceTiming): Date {
  const session = raceSession(race);
  if (session && !sessionsAreDateOnlyPlaceholders(race)) {
    const end = resolveTimedSessionEnd(session);
    if (end) return end;
  }
  return new Date(raceStartInstant(race).getTime() + SESSION_DURATION_MS.R);
}

export function isRaceComplete(
  race: RaceTiming,
  now: Date,
  bufferMs: number = SESSION_END_BUFFER_MS
): boolean {
  return now.getTime() > raceEndInstant(race).getTime() + bufferMs;
}

/** UTC midnight of the first session day. Placeholder timetables start two days before the race. */
export function weekendStartInstant(race: RaceTiming): Date {
  if (!sessionsAreDateOnlyPlaceholders(race)) {
    const starts = (race.sessions ?? [])
      .map((session) => sessionStart(session))
      .filter((start): start is Date => start !== null);
    if (starts.length > 0) {
      const earliest = starts.reduce((left, right) => (left.getTime() < right.getTime() ? left : right));
      const day = new Date(earliest);
      day.setUTCHours(0, 0, 0, 0);
      return day;
    }
  }
  const start = asDate(race.race_date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 2);
  return start;
}

/** True from the first session day through the race end, including the post-race buffer. */
export function isActiveRaceWeekend(race: RaceTiming, now: Date): boolean {
  if (isRaceComplete(race, now)) return false;
  return now.getTime() >= weekendStartInstant(race).getTime();
}

export function pickNextRace<T extends RaceTiming>(races: T[], now: Date): T | null {
  const sorted = [...races].sort(
    (left, right) => asDate(left.race_date).getTime() - asDate(right.race_date).getTime()
  );
  return sorted.find((race) => !isRaceComplete(race, now)) ?? null;
}

export function pickActiveWeekendRace<T extends RaceTiming>(races: T[], now: Date): T | null {
  const sorted = [...races].sort(
    (left, right) => asDate(left.race_date).getTime() - asDate(right.race_date).getTime()
  );
  return sorted.find((race) => isActiveRaceWeekend(race, now)) ?? null;
}

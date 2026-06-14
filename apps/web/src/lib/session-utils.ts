import type { SessionType } from "@pitwall/types";

const LIVE_SESSION_TYPES = new Set<SessionType>(["FP1", "FP2", "FP3", "Q", "SQ", "S", "R"]);

export function mapOpenF1SessionType(name: string, type?: string): SessionType | null {
  const normalized = (type ?? name).toUpperCase();
  if (normalized.includes("FP1") || normalized === "P1") return "FP1";
  if (normalized.includes("FP2") || normalized === "P2") return "FP2";
  if (normalized.includes("FP3") || normalized === "P3") return "FP3";
  if (normalized.includes("SPRINT QUALIFYING") || normalized === "SQ") return "SQ";
  if (normalized.includes("SPRINT") || normalized === "S") return "S";
  if (normalized.includes("QUALIFYING") || normalized === "Q") return "Q";
  if (normalized.includes("RACE") || normalized === "R") return "R";
  return null;
}

export function isLiveSessionType(type: SessionType | null): boolean {
  return type !== null && LIVE_SESSION_TYPES.has(type);
}

const SESSION_DURATION_MS: Record<string, number> = {
  FP1: 60 * 60 * 1000,
  FP2: 60 * 60 * 1000,
  FP3: 60 * 60 * 1000,
  Q: 60 * 60 * 1000,
  SQ: 45 * 60 * 1000,
  S: 60 * 60 * 1000,
  R: 2 * 60 * 60 * 1000,
};

/** Grace after scheduled session end (races can run slightly over). */
export const SESSION_END_BUFFER_MS = 30 * 60 * 1000;

export function resolveSessionEnd(
  session: {
    dateStart?: string | Date;
    date_start?: string | Date;
    dateEnd?: string | Date | null;
    date_end?: string | Date | null;
    sessionType?: SessionType | string | null;
    session_type?: SessionType | string | null;
  }
): Date | null {
  const startRaw = session.dateStart ?? session.date_start;
  if (!startRaw) return null;
  const start = startRaw instanceof Date ? startRaw : new Date(startRaw);

  const endRaw = session.dateEnd ?? session.date_end;
  let end = endRaw ? (endRaw instanceof Date ? endRaw : new Date(endRaw)) : null;

  if (!end || end.getTime() <= start.getTime()) {
    const type = session.sessionType ?? session.session_type;
    const duration = (type && SESSION_DURATION_MS[type]) || SESSION_DURATION_MS.R;
    end = new Date(start.getTime() + duration);
  }

  return end;
}

export function isSessionEnded(
  session: Parameters<typeof resolveSessionEnd>[0],
  bufferMs: number = SESSION_END_BUFFER_MS
): boolean {
  const end = resolveSessionEnd(session);
  if (!end) return false;
  return Date.now() > end.getTime() + bufferMs;
}

export function isSessionLive(
  session: {
    dateStart?: string | Date;
    date_start?: string | Date;
    dateEnd?: string | Date | null;
    date_end?: string | Date | null;
    sessionType?: SessionType | string | null;
    session_type?: SessionType | string | null;
  }
): boolean {
  const startRaw = session.dateStart ?? session.date_start;
  if (!startRaw) return false;
  const start = startRaw instanceof Date ? startRaw : new Date(startRaw);
  const now = Date.now();
  if (now < start.getTime()) return false;

  const end = resolveSessionEnd(session);
  if (!end) return false;

  return now <= end.getTime() + SESSION_END_BUFFER_MS;
}

export function secondsUntil(date: Date): number {
  return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
}

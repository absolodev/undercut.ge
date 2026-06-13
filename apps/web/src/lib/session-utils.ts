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

export function isSessionLive(session: { dateStart?: string; date_start?: string; dateEnd?: string | null; date_end?: string | null }): boolean {
  const startStr = session.dateStart ?? session.date_start;
  if (!startStr) return false;
  const start = new Date(startStr);
  const endStr = session.dateEnd ?? session.date_end;
  const end = endStr ? new Date(endStr) : null;
  const now = new Date();
  if (now < start) return false;
  if (!end) return true;
  return now <= end;
}

export function secondsUntil(date: Date): number {
  return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
}

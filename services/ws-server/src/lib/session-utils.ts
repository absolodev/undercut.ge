import type { SessionInfo, SessionType } from "@pitwall/types";

export function mapOpenF1SessionType(name: string, type?: string): SessionType {
  const normalized = (type ?? name).toUpperCase();
  if (normalized.includes("FP1") || normalized === "P1") return "FP1";
  if (normalized.includes("FP2") || normalized === "P2") return "FP2";
  if (normalized.includes("FP3") || normalized === "P3") return "FP3";
  if (normalized.includes("SPRINT QUALIFYING") || normalized === "SQ") return "SQ";
  if (normalized.includes("SPRINT") || normalized === "S") return "S";
  if (normalized.includes("QUALIFYING") || normalized === "Q") return "Q";
  return "R";
}

export function mapCircuitRef(shortName?: string): string {
  if (!shortName) return "";
  const key = shortName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const aliases: Record<string, string> = {
    catalunya: "catalunya",
    barcelona: "catalunya",
  };
  return aliases[key] ?? shortName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function mapOpenF1Session(session: Record<string, unknown>): SessionInfo {
  const sessionName = String(session.session_name ?? "");
  return {
    sessionKey: Number(session.session_key),
    sessionType: mapOpenF1SessionType(sessionName, session.session_type as string | undefined),
    sessionName,
    meetingName: String(session.location ?? session.country_name ?? ""),
    circuitName: mapCircuitRef(session.circuit_short_name as string | undefined),
    circuitShortName: String(session.circuit_short_name ?? ""),
    countryName: String(session.country_name ?? ""),
    dateStart: String(session.date_start ?? ""),
    dateEnd: session.date_end ? String(session.date_end) : null,
    totalLaps: Number(session.total_laps ?? 0),
  };
}

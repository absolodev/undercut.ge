import type { SessionInfo, SessionType } from "@pitwall/types";

const CIRCUIT_REF_MAP: Record<string, string> = {
  catalunya: "catalunya",
  barcelona: "catalunya",
  circuitdebarcelonacatalunya: "catalunya",
  silverstone: "silverstone",
  monaco: "monaco",
  montecarlo: "monaco",
  monza: "monza",
  autodromonazionalemonza: "monza",
  spa: "spa",
  spafrancorchamps: "spa",
  suzuka: "suzuka",
  interlagos: "interlagos",
  saopaulo: "interlagos",
  autodromojosecarlospace: "interlagos",
  bahrain: "bahrain",
  sakhir: "bahrain",
  bahraininternationalcircuit: "bahrain",
  jeddah: "jeddah",
  melbourne: "albert_park",
  albertpark: "albert_park",
  austin: "americas",
  circuitoftheamericas: "americas",
  cota: "americas",
  montreal: "villeneuve",
  villeneuve: "villeneuve",
  gillesvilleneuve: "villeneuve",
  budapest: "hungaroring",
  hungaroring: "hungaroring",
  singapore: "marina_bay",
  marinabay: "marina_bay",
  marinabaysands: "marina_bay",
  abudhabi: "yas_marina",
  yasmarina: "yas_marina",
  yasmarinacircuit: "yas_marina",
  imola: "imola",
  autodromoenzoedinoferrari: "imola",
  zandvoort: "zandvoort",
  paulricard: "ricard",
  lecastellet: "ricard",
  portimao: "portimao",
  mugello: "mugello",
  istanbul: "istanbul",
  losail: "losail",
  qatar: "losail",
  miamigp: "miami",
  miami: "miami",
  madrid: "madrid",
  jeddahcornichecircuit: "jeddah",
  lasvegas: "vegas",
  vegas: "vegas",
  shanghai: "shanghai",
};

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
  return CIRCUIT_REF_MAP[key] ?? shortName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
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

export function isSessionLive(session: { date_start: string; date_end: string | null }): boolean {
  const start = new Date(session.date_start);
  const end = session.date_end ? new Date(session.date_end) : null;
  const now = new Date();
  if (now < start) return false;
  if (!end) return true;
  return now <= end;
}

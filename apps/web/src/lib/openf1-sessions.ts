import type { SessionType } from "@pitwall/types";

const OPENF1_BASE = "https://api.openf1.org/v1";

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type?: string;
  date_start: string;
  date_end: string | null;
  circuit_short_name?: string;
  location?: string;
  country_name?: string;
}

export type OpenF1SessionResult =
  | { kind: "session"; session: OpenF1Session }
  | { kind: "live-restricted" }
  | { kind: "unavailable" };

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getOpenF1AccessToken(): Promise<string | null> {
  const username = process.env.OPENF1_USERNAME;
  const password = process.env.OPENF1_PASSWORD;
  if (!username || !password) return process.env.OPENF1_ACCESS_TOKEN ?? null;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  try {
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${OPENF1_BASE.replace("/v1", "")}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

function isLiveRestrictionMessage(detail: string): boolean {
  return /live f1 session in progress/i.test(detail);
}

export async function fetchOpenF1LatestSession(): Promise<OpenF1SessionResult> {
  try {
    const token = await getOpenF1AccessToken();
    const headers: HeadersInit = { accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${OPENF1_BASE}/sessions?session_key=latest`, {
      cache: "no-store",
      headers,
    });
    const data = (await res.json()) as OpenF1Session[] | { detail?: string };

    if (!Array.isArray(data)) {
      if (typeof data.detail === "string" && isLiveRestrictionMessage(data.detail)) {
        return { kind: "live-restricted" };
      }
      return { kind: "unavailable" };
    }

    if (data.length === 0) return { kind: "unavailable" };
    return { kind: "session", session: data[0] };
  } catch {
    return { kind: "unavailable" };
  }
}

export function mapOpenF1CircuitRef(shortName?: string): string {
  if (!shortName) return "";
  const key = shortName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const aliases: Record<string, string> = {
    catalunya: "catalunya",
    barcelona: "catalunya",
    circuitdebarcelonacatalunya: "catalunya",
  };
  return aliases[key] ?? shortName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export type { SessionType };

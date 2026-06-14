const OPENF1_BASE = "https://api.openf1.org/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isLiveRestrictionDetail(detail: unknown): boolean {
  return typeof detail === "string" && /live f1 session in progress/i.test(detail);
}

export async function getOpenF1AccessToken(): Promise<string | null> {
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

export async function openF1Fetch(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<{ ok: true; data: unknown[] } | { ok: false; restricted: boolean }> {
  const token = await getOpenF1AccessToken();
  const headers: HeadersInit = { accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const qs = new URLSearchParams(params);
  const res = await fetch(`${OPENF1_BASE}/${endpoint}?${qs}`, { headers });

  let body: unknown[] | { detail?: string };
  try {
    body = (await res.json()) as unknown[] | { detail?: string };
  } catch {
    return { ok: false, restricted: false };
  }

  if (!Array.isArray(body)) {
    return { ok: false, restricted: isLiveRestrictionDetail(body.detail) };
  }

  if (!res.ok) {
    return { ok: false, restricted: false };
  }

  return { ok: true, data: body };
}

export function hasOpenF1Credentials(): boolean {
  return Boolean(
    process.env.OPENF1_ACCESS_TOKEN ||
      (process.env.OPENF1_USERNAME && process.env.OPENF1_PASSWORD)
  );
}

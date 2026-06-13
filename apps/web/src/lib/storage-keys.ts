/** Read localStorage with backward-compatible PitWall → UnderCut key migration. */
export function readStoredValue(key: string, legacyKey?: string): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(key);
  if (value !== null) return value;
  if (!legacyKey) return null;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy !== null) {
    localStorage.setItem(key, legacy);
  }
  return legacy;
}

export function writeStoredValue(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export const STORAGE_KEYS = {
  cookieConsent: "undercut-cookie-consent",
  cookieConsentLegacy: "pitwall-cookie-consent",
  dataDisclaimer: "undercut-data-disclaimer",
  dataDisclaimerLegacy: "pitwall-data-disclaimer",
} as const;

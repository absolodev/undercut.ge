export const locales = ["en", "es", "ka"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ka: "ქართული",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Cloudflare `CF-IPCountry` on VPS; `x-vercel-ip-country` on Vercel. */
export function getClientCountry(
  cfIpCountry: string | null,
  vercelIpCountry: string | null
): string | null {
  return cfIpCountry ?? vercelIpCountry;
}

/**
 * Locale priority for bare `/` visits (no URL prefix): cookie → Accept-Language → geo → default.
 * URL locale prefix is handled by next-intl middleware and always wins on prefixed paths.
 */
export function detectLocaleFromHeaders(
  cfIpCountry: string | null,
  vercelIpCountry: string | null,
  acceptLanguage: string | null,
  cookieLocale: string | undefined
): Locale {
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const al = (acceptLanguage ?? "").toLowerCase();
  if (al.startsWith("ka") || al.includes(",ka")) return "ka";
  if (al.startsWith("es") || al.includes(",es")) return "es";

  const country = getClientCountry(cfIpCountry, vercelIpCountry);
  if (country === "GE") return "ka";

  return defaultLocale;
}

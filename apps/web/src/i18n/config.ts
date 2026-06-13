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

export function detectLocaleFromHeaders(
  cookieLocale: string | undefined,
  country: string | null,
  acceptLanguage: string | null
): Locale {
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;
  if (country === "GE") return "ka";
  const al = (acceptLanguage ?? "").toLowerCase();
  if (al.startsWith("ka") || al.includes(",ka")) return "ka";
  if (al.startsWith("es") || al.includes(",es")) return "es";
  return defaultLocale;
}

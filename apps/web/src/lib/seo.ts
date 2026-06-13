import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { getDriverSeoName, getDriverSeoKeywords } from "./seo/driver-names";

const SITE_NAME = "UnderCut";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://undercut.ge";
const DEFAULT_DESCRIPTION =
  "Formula 1 companion with live timing, telemetry, championship standings, and historical race data.";

const OG_LOCALE_MAP: Record<Locale, string> = {
  en: "en_US",
  es: "es_ES",
  ka: "ka_GE",
};

export function getSiteUrl(path = "", locale?: Locale): string {
  const base = SITE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  if (!locale) {
    return normalized ? `${base}${normalized}` : base;
  }
  const localePath = normalized === "" || normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
  return `${base}${localePath}`;
}

export function buildLocaleAlternates(path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = getSiteUrl(path, locale);
  }
  languages["x-default"] = getSiteUrl(path, "en");
  return {
    canonical: getSiteUrl(path, "en"),
    languages,
  };
}

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  locale = "en" as Locale,
  keywords,
  noIndex = false,
  openGraphType = "website" as const,
}: {
  title: string;
  description?: string;
  path?: string;
  locale?: Locale;
  keywords?: string[];
  noIndex?: boolean;
  openGraphType?: "website" | "profile";
}): Metadata {
  const canonical = getSiteUrl(path, locale);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const alternates = buildLocaleAlternates(path);

  const otherLocales = locales
    .filter((l) => l !== locale)
    .map((l) => ({ url: getSiteUrl(path, l), locale: OG_LOCALE_MAP[l] }));

  return {
    title: fullTitle,
    description,
    keywords,
    alternates,
    openGraph: {
      type: openGraphType,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: canonical,
      locale: OG_LOCALE_MAP[locale],
      alternateLocale: otherLocales.map((o) => o.locale),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export const defaultMetadata: Metadata = buildPageMetadata({
  title: "UnderCut — F1 Telemetry & Timing",
  path: "/",
});

export function buildDriverMetadata({
  driverRef,
  fullName,
  locale,
  wins,
  championships,
}: {
  driverRef: string;
  fullName: string;
  locale: Locale;
  wins?: number;
  championships?: number;
}): Metadata {
  const seoName = getDriverSeoName(driverRef, locale, fullName);
  const path = `/f1/drivers/${driverRef}`;

  const descriptions: Record<Locale, string> = {
    en: `${seoName} F1 driver profile — career wins, podiums, poles, and season-by-season results on UnderCut.`,
    es: `Perfil de ${seoName} en Fórmula 1 — victorias, podios, poles y resultados por temporada en UnderCut.`,
    ka: `${seoName} — ფორმულა 1-ის მძღოლის პროფილი UnderCut-ზე: გამარჯვებები, პოდიუმები და სეზონური შედეგები.`,
  };

  const titleParts = [seoName, "F1 Driver"];
  if (championships && championships > 0) titleParts.push(`${championships}× World Champion`);
  else if (wins && wins > 0) titleParts.push(`${wins} GP wins`);

  return buildPageMetadata({
    title: titleParts.join(" — "),
    description: descriptions[locale],
    path,
    locale,
    keywords: getDriverSeoKeywords(driverRef, fullName),
    openGraphType: "profile",
  });
}

export function buildConstructorMetadata({
  name,
  locale,
  constructorRef,
}: {
  name: string;
  locale: Locale;
  constructorRef: string;
}): Metadata {
  const path = `/f1/constructors/${constructorRef}`;
  const descriptions: Record<Locale, string> = {
    en: `${name} Formula 1 team profile — constructors and drivers' championships, wins, and season history.`,
    es: `Perfil del equipo ${name} en Fórmula 1 — campeonatos, victorias e historial por temporada.`,
    ka: `${name} — ფორმულა 1-ის გუნდის პროფილი UnderCut-ზე: ჩემპიონატები, გამარჯვებები და სეზონური ისტორია.`,
  };

  return buildPageMetadata({
    title: `${name} — F1 Constructor`,
    description: descriptions[locale],
    path,
    locale,
    keywords: [name, "Formula 1", "F1 team", "constructor", constructorRef],
  });
}

export function buildSeasonMetadata({
  year,
  locale,
}: {
  year: number;
  locale: Locale;
}): Metadata {
  const path = `/f1/seasons/${year}`;
  const descriptions: Record<Locale, string> = {
    en: `${year} Formula 1 season — full race calendar, results, standings, and championship battle.`,
    es: `Temporada ${year} de Fórmula 1 — calendario, resultados y clasificaciones.`,
    ka: `${year} ფორმულა 1-ის სეზონი — კალენდარი, შედეგები და ჩემპიონატის ცხრილები UnderCut-ზე.`,
  };

  return buildPageMetadata({
    title: `${year} F1 Season`,
    description: descriptions[locale],
    path,
    locale,
    keywords: [`F1 ${year}`, "Formula 1 season", `${year} calendar`, `${year} standings`],
  });
}

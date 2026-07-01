import type { MetadataRoute } from "next";
import { prisma } from "@pitwall/db";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
import { CURRENT_SEASON } from "@/lib/config";
import { locales } from "@/i18n/config";

const STATIC_PATHS = [
  { path: "", priority: 1, changeFrequency: "hourly" as const },
  { path: "/live", priority: 0.9, changeFrequency: "always" as const },
  { path: "/f1/seasons", priority: 0.8, changeFrequency: "weekly" as const },
  { path: `/f1/seasons/${CURRENT_SEASON}`, priority: 0.8, changeFrequency: "daily" as const },
  { path: "/f1/drivers", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/f1/constructors", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/f1/compare", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/legal/cookies", priority: 0.3, changeFrequency: "yearly" as const },
];

function localeUrl(path: string, locale: (typeof locales)[number]): string {
  return getSiteUrl(path, locale);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  let drivers: { driver_ref: string }[] = [];
  let constructors: { constructor_ref: string }[] = [];
  let seasons: { year: number }[] = [];

  try {
    [drivers, constructors, seasons] = await Promise.all([
      prisma.f1_drivers.findMany({
        where: { is_active: true },
        select: { driver_ref: true },
      }),
      prisma.f1_constructors.findMany({
        where: { is_active: true },
        select: { constructor_ref: true },
      }),
      prisma.f1_seasons.findMany({
        where: { year: { gte: 1950 } },
        select: { year: true },
        orderBy: { year: "desc" },
        take: 80,
      }),
    ]);
  } catch (error) {
    console.error("sitemap: database unavailable, emitting static paths only", error);
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of STATIC_PATHS) {
      entries.push({
        url: localeUrl(route.path, locale),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }

    for (const driver of drivers) {
      entries.push({
        url: localeUrl(`/f1/drivers/${driver.driver_ref}`, locale),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const team of constructors) {
      entries.push({
        url: localeUrl(`/f1/constructors/${team.constructor_ref}`, locale),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const season of seasons) {
      entries.push({
        url: localeUrl(`/f1/seasons/${season.year}`, locale),
        lastModified: now,
        changeFrequency: season.year === CURRENT_SEASON ? "daily" : "yearly",
        priority: season.year === CURRENT_SEASON ? 0.75 : 0.5,
      });
    }
  }

  return entries;
}

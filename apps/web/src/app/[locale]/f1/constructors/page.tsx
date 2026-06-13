import { getAllConstructors } from "@/lib/data/archives/constructors";
import { getConstructorQuickStats } from "@/lib/data/constructors-profile";
import { getSeasonConstructors } from "@/lib/data/season-grid";
import { ConstructorsTabs } from "@/components/constructors/constructors-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { parseSeasonYear } from "@/lib/season";
import { buildPageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const year = parseSeasonYear(season);
  return buildPageMetadata({
    title: `${year} F1 Constructors`,
    description: `Browse the ${year} Formula 1 constructor lineup and all-time archive on UnderCut.`,
    path: `/f1/constructors${season ? `?season=${year}` : ""}`,
  });
}

export default async function ConstructorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  await setLocaleFromParams(params);
  const { season } = await searchParams;
  const seasonYear = parseSeasonYear(season);
  const t = await getTranslations("Constructors");

  const [seasonGrid, archive, quickStats] = await Promise.all([
    getSeasonConstructors(seasonYear),
    getAllConstructors(),
    getConstructorQuickStats(),
  ]);

  const statsById = new Map(quickStats.map((s) => [s.constructor_id, s]));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title={t("listTitle")}
        seasonYear={seasonYear}
        description={t("listDescription", { year: seasonYear })}
        breadcrumbs={[
          { label: "F1", href: "/f1/seasons" },
          { label: t("listTitle") },
        ]}
      />
      <ConstructorsTabs
        currentGrid={seasonGrid}
        archive={archive}
        statsById={statsById}
        labels={{
          currentTab: t("currentGridTab", { year: seasonYear }),
          archiveTab: t("archiveTab"),
          active: t("active"),
          historical: t("historical"),
          wins: t("wins"),
          bestFinish: t("bestFinish"),
        }}
      />
    </div>
  );
}

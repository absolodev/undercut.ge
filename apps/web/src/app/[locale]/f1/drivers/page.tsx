import { getAllDrivers } from "@/lib/data/archives/drivers";
import { getSeasonGridDrivers } from "@/lib/data/season-grid";
import { DriversTabs } from "@/components/drivers/drivers-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { parseSeasonYear } from "@/lib/season";
import { buildPageMetadata } from "@/lib/seo";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const year = parseSeasonYear(season);
  return buildPageMetadata({
    title: `${year} F1 Drivers`,
    description: `Browse the ${year} Formula 1 driver grid and all-time archive on UnderCut.`,
    path: `/f1/drivers${season ? `?season=${year}` : ""}`,
  });
}

export default async function DriversPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  await setLocaleFromParams(params);
  const { season } = await searchParams;
  const seasonYear = parseSeasonYear(season);

  const [seasonGrid, archive] = await Promise.all([
    getSeasonGridDrivers(seasonYear),
    getAllDrivers(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Drivers"
        seasonYear={seasonYear}
        description={`Drivers who competed in the ${seasonYear} season. Use the season selector in the header to browse other years.`}
        breadcrumbs={[
          { label: "F1", href: "/f1/seasons" },
          { label: "Drivers" },
        ]}
      />
      <DriversTabs currentGrid={seasonGrid} archive={archive} seasonYear={seasonYear} />
    </div>
  );
}

import { getDriverProfile } from "@/lib/data/drivers-profile";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { DriverHeaderCard } from "@/components/profiles/driver-header-card";
import { CareerStatsGrid } from "@/components/profiles/career-stats-grid";
import { SeasonBreakdownTable } from "@/components/profiles/season-breakdown-table";
import { PerformanceCharts } from "@/components/profiles/performance-charts";
import { TeammateH2H } from "@/components/profiles/teammate-h2h";
import { buildDriverMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/layout/json-ld";
import { getSiteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { getDriverSeoName } from "@/lib/seo/driver-names";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: localeParam, id } = await params;
  const locale = localeParam as Locale;
  const data = await getDriverProfile(id);
  if (!data) return { title: "Driver — UnderCut" };
  const statsRow = (data.stats as Array<{ wins?: bigint | number }>)[0];
  return buildDriverMetadata({
    driverRef: id,
    fullName: data.driver.full_name,
    locale,
    wins: Number(statsRow?.wins ?? 0),
  });
}

export default async function DriverProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const locale = await setLocaleFromParams(params);
  const { id } = await params;
  const data = await getDriverProfile(id);
  if (!data) notFound();

  const { driver, stats, poles, fastestLaps, seasonBreakdown } = data;
  const seoName = getDriverSeoName(driver.driver_ref, locale, driver.full_name);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: seoName,
    alternateName: driver.full_name,
    nationality: driver.nationality ?? undefined,
    url: getSiteUrl(`/f1/drivers/${driver.driver_ref}`, locale),
    jobTitle: "Formula 1 Racing Driver",
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <JsonLd data={personJsonLd} />
      <Link href="/f1/drivers" className="text-[#E10600] text-sm hover:underline font-mono mb-4 inline-block">
        ← ALL DRIVERS
      </Link>

      <DriverHeaderCard driver={driver} />
      <CareerStatsGrid stats={stats} poles={poles} fastestLaps={fastestLaps} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <SeasonBreakdownTable seasons={seasonBreakdown} />
        <PerformanceCharts seasonData={seasonBreakdown} driverId={driver.id} />
      </div>

      <TeammateH2H driverId={driver.id} />
    </div>
  );
}

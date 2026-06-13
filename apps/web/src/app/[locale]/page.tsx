import { redirect } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { HomeShell } from "@/components/home/home-shell";
import { SeasonDashboard } from "@/components/home/season-dashboard";
import { RecordsSection } from "@/components/home/records-section";
import { NewsSection } from "@/components/home/news-section";
import { WeekendPreview } from "@/components/home/weekend-preview";
import {
  getActiveWeekendRace,
  getLatestStandings,
  getNextRace,
  getRecentRaceResults,
  getSeasonNews,
} from "@/lib/data/current/season";
import { getSeasonStats } from "@/lib/data/season-grid";
import { getMostWins, getMostPoles, getRecordsDataCoverage } from "@/lib/data/records";
import { getLiveLapCount, getLiveRaceStandings } from "@/lib/data/live/standings";
import { getLiveWeather } from "@/lib/data/live/weather";
import { CURRENT_SEASON } from "@/lib/config";
import { resolveLiveSessionStatus } from "@/lib/live-status-server";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/layout/json-ld";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return buildPageMetadata({
    title: t("title"),
    description: t("seoIntro", { year: CURRENT_SEASON }),
    path: "/",
    locale: locale as Locale,
    keywords: [
      "Formula 1",
      "F1 standings",
      "F1 results",
      `${CURRENT_SEASON} F1 season`,
      "live timing",
      "championship",
    ],
  });
}

export default async function HomePage() {
  const seasonYear = CURRENT_SEASON;
  const t = await getTranslations("Home");
  const [status, standings, recentResults, weekendRace, nextRace, seasonStats, news, wins, poles, coverage] =
    await Promise.all([
      resolveLiveSessionStatus(),
      getLatestStandings(seasonYear),
      getRecentRaceResults(seasonYear, 5),
      getActiveWeekendRace(seasonYear),
      getNextRace(seasonYear),
      getSeasonStats(seasonYear),
      getSeasonNews(),
      getMostWins(),
      getMostPoles(),
      getRecordsDataCoverage(),
    ]);

  if (status.mode === "live") {
    const locale = await getLocale();
    redirect({ href: "/live", locale });
  }

  const [liveStandings, liveLap, weather] = await Promise.all([
    getLiveRaceStandings(),
    getLiveLapCount(),
    getLiveWeather(),
  ]);

  const driverStandings = standings.drivers.map((s) => ({
    position: s.position,
    label: s.driver.full_name,
    sublabel: s.driver.broadcast_name,
    points: s.points,
    driverRef: "driver_ref" in s.driver ? s.driver.driver_ref : undefined,
    headshotUrl: "headshot_url" in s.driver ? s.driver.headshot_url : undefined,
  }));

  const constructorStandings = standings.constructors.map((s) => ({
    position: s.position,
    label: s.constructor.name,
    points: s.points,
    color: s.constructor.color_primary ?? undefined,
    constructorRef: "constructor_ref" in s.constructor ? s.constructor.constructor_ref : undefined,
    logoUrl: "logo_url" in s.constructor ? s.constructor.logo_url : undefined,
  }));

  const recent = recentResults.map((race) => ({
    round: race.round,
    race_name: race.race_name,
    race_date: race.race_date,
    circuit: race.circuit,
    results: (race.sessions[0]?.results ?? []).map((r) => ({
      position: r.finish_position ?? 0,
      driver: r.driver.broadcast_name,
      points: r.points,
    })),
    podium: (race.sessions[0]?.results ?? [])
      .filter((r) => (r.finish_position ?? 99) <= 3)
      .map((r) => ({
        position: r.finish_position ?? 0,
        driver: r.driver.broadcast_name,
      })),
  }));

  const countdownSeconds =
    status.countdownSeconds ??
    (nextRace
      ? Math.max(0, Math.floor((new Date(nextRace.race_date).getTime() - Date.now()) / 1000))
      : null);

  const sportsEventJsonLd =
    nextRace && countdownSeconds !== null
      ? {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: nextRace.race_name,
          startDate: nextRace.race_date.toISOString(),
          sport: "Formula 1",
          location: {
            "@type": "Place",
            name: nextRace.circuit.name,
          },
          url: getSiteUrl(`/f1/seasons/${seasonYear}/${nextRace.round}`),
        }
      : null;

  const coverageNote =
    coverage.minSeason && coverage.maxSeason
      ? coverage.minSeason < 2020
        ? t("recordsCoverageFull", { min: coverage.minSeason, max: coverage.maxSeason })
        : t("recordsCoveragePartial", { min: coverage.minSeason })
      : t("recordsCoverageEmpty");

  return (
    <HomeShell>
      {sportsEventJsonLd && <JsonLd data={sportsEventJsonLd} />}
      {status.mode === "weekend" && weekendRace ? (
        <WeekendPreview
          status={status}
          race={weekendRace}
          liveStandings={liveStandings}
          liveLap={liveLap}
          weather={weather}
        />
      ) : (
        <SeasonDashboard
          seasonYear={seasonYear}
          standingsRound={standings.round}
          standingsSource={"source" in standings ? standings.source : "official"}
          nextRace={nextRace}
          countdownSeconds={countdownSeconds}
          driverStandings={driverStandings}
          constructorStandings={constructorStandings}
          recentResults={recent}
          seasonStats={seasonStats}
        />
      )}

      {status.mode !== "weekend" && (
        <div className="mt-10 space-y-8">
          <RecordsSection wins={wins} poles={poles} coverageNote={coverageNote} />
          <section className="text-sm text-white/50 leading-relaxed max-w-3xl">
            <p>{t("seoIntro", { year: seasonYear })}</p>
          </section>
          <NewsSection news={news} />
        </div>
      )}
    </HomeShell>
  );
}

import { getConstructorProfile } from "@/lib/data/constructors-profile";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ConstructorHeaderCard } from "@/components/profiles/constructor-header-card";
import { ConstructorCareerStatsGrid } from "@/components/profiles/constructor-career-stats";
import { ConstructorDriversList } from "@/components/profiles/constructor-drivers-list";
import { ConstructorSeasonTable } from "@/components/profiles/constructor-season-table";
import { ConstructorPerformanceCharts } from "@/components/profiles/constructor-performance-charts";
import { TeamLogo } from "@/components/ui/team-logo";
import { resolveConstructorColor } from "@/lib/assets/constructors";
import { buildConstructorMetadata, getSiteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { JsonLd } from "@/components/layout/json-ld";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const data = await getConstructorProfile(id);
  if (!data) return { title: "Constructor — UnderCut" };
  return buildConstructorMetadata({
    name: data.constructor.name,
    constructorRef: id,
    locale: locale as Locale,
  });
}

export default async function ConstructorProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const locale = (await setLocaleFromParams(params)) as Locale;
  const { id } = await params;
  const data = await getConstructorProfile(id);
  if (!data) notFound();

  const t = await getTranslations("Constructors");
  const { constructor, stats, drivers, seasonHistory, topDrivers } = data;
  const teamColor = resolveConstructorColor(constructor.constructor_ref, constructor.color_primary);

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: constructor.name,
    sport: "Formula 1",
    url: getSiteUrl(`/f1/constructors/${constructor.constructor_ref}`, locale),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <JsonLd data={teamJsonLd} />
      <ConstructorHeaderCard
        constructor={constructor}
        backLabel={t("backToAll")}
        activeLabel={t("active")}
        historicalLabel={t("historical")}
      />

      <ConstructorCareerStatsGrid
        stats={stats}
        labels={{
          title: t("careerStats"),
          races: t("races"),
          wins: t("wins"),
          podiums: t("podiums"),
          poles: t("poles"),
          points: t("points"),
          constructorChampionships: t("constructorChampionships"),
          driverChampionships: t("driverChampionships"),
          bestFinish: t("bestFinish"),
        }}
      />

      <ConstructorDriversList
        drivers={drivers}
        topDrivers={topDrivers}
        teamColor={teamColor}
        labels={{
          title: t("driversTitle"),
          empty: t("driversEmpty"),
          seasons: t("seasons"),
          wins: t("wins"),
          podiums: t("podiums"),
          poles: t("poles"),
          points: t("points"),
          championships: t("championships"),
          teamLeader: t("teamLeader"),
          mostWins: t("mostWins"),
          mostPoles: t("mostPoles"),
          mostPoints: t("mostPoints"),
        }}
        leaderNames={{
          wins: topDrivers.wins_leader ?? "",
          poles: topDrivers.poles_leader ?? "",
          points: topDrivers.points_leader ?? "",
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <ConstructorSeasonTable
          seasons={seasonHistory}
          labels={{
            title: t("seasonHistory"),
            empty: t("seasonHistoryEmpty"),
            year: t("year"),
            position: t("position"),
            wins: t("wins"),
            podiums: t("podiums"),
            points: t("points"),
            lineup: t("lineup"),
          }}
        />
        <ConstructorPerformanceCharts
          seasonData={seasonHistory}
          teamColor={teamColor}
          labels={{
            championshipPosition: t("chartPosition"),
            pointsScored: t("chartPoints"),
            winsPerSeason: t("chartWins"),
            noChartData: t("chartEmpty"),
          }}
        />
      </div>

      {(constructor.predecessor || constructor.successors.length > 0) && (
        <div>
          <h2 className="font-display text-2xl font-bold mb-4">{t("teamTimeline")}</h2>
          <div className="bg-[#111] border border-white/10 rounded-lg p-6 flex items-center gap-4 overflow-x-auto">
            {constructor.predecessor && (
              <>
                <TimelineCard
                  href={`/f1/constructors/${constructor.predecessor.constructor_ref}`}
                  name={constructor.predecessor.name}
                  constructorRef={constructor.predecessor.constructor_ref}
                  logoUrl={constructor.predecessor.logo_url}
                  color={constructor.predecessor.color_primary}
                  badge={t("predecessor")}
                />
                <TimelineArrow />
              </>
            )}

            <div
              className="shrink-0 p-4 border-2 rounded flex items-center gap-3"
              style={{
                borderColor: teamColor ?? "#E10600",
                backgroundColor: teamColor ? `${teamColor}22` : undefined,
              }}
            >
              <TeamLogo
                constructorRef={constructor.constructor_ref}
                name={constructor.name}
                logoUrl={constructor.logo_url}
                color={teamColor}
                size={32}
              />
              <div>
                <div className="font-display font-bold">{constructor.name}</div>
                <div className="text-[10px] text-white/50 font-mono uppercase">{t("currentView")}</div>
              </div>
            </div>

            {constructor.successors.length > 0 && (
              <>
                <TimelineArrow />
                {constructor.successors.map((succ) => (
                  <TimelineCard
                    key={succ.id}
                    href={`/f1/constructors/${succ.constructor_ref}`}
                    name={succ.name}
                    constructorRef={succ.constructor_ref}
                    logoUrl={succ.logo_url}
                    color={succ.color_primary}
                    badge={t("successor")}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineArrow() {
  return (
    <>
      <div className="w-8 h-px bg-white/30 shrink-0" />
      <div className="text-white/30">→</div>
      <div className="w-8 h-px bg-white/30 shrink-0" />
    </>
  );
}

function TimelineCard({
  href,
  name,
  constructorRef,
  logoUrl,
  color,
  badge,
}: {
  href: string;
  name: string;
  constructorRef: string;
  logoUrl?: string | null;
  color?: string | null;
  badge: string;
}) {
  const teamColor = resolveConstructorColor(constructorRef, color);
  return (
    <Link
      href={href}
      className="shrink-0 p-4 bg-[#222] border border-white/10 rounded hover:border-[#E10600] flex items-center gap-3"
    >
      <TeamLogo
        constructorRef={constructorRef}
        name={name}
        logoUrl={logoUrl}
        color={teamColor}
        size={28}
      />
      <div>
        <div className="font-display font-bold">{name}</div>
        <div className="text-[10px] text-white/50 font-mono uppercase">{badge}</div>
      </div>
    </Link>
  );
}

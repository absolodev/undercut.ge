import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { TeamLogo } from "@/components/ui/team-logo";
import { DriverAvatar } from "@/components/ui/driver-avatar";

interface StandingRow {
  position: number;
  label: string;
  sublabel?: string;
  points: number;
  color?: string;
  logoUrl?: string | null;
  constructorRef?: string | null;
  driverRef?: string | null;
  headshotUrl?: string | null;
}

interface NewsItem {
  date: string;
  category: string;
  title: string;
  summary: string;
}

interface SeasonDashboardProps {
  seasonYear: number;
  standingsRound: number;
  standingsSource?: "official" | "computed";
  nextRace: {
    race_name: string;
    round: number;
    race_date: Date;
    circuit: { name: string; country: string | null; location?: string | null };
  } | null;
  countdownSeconds: number | null;
  driverStandings: StandingRow[];
  constructorStandings: StandingRow[];
  recentResults: Array<{
    round: number;
    race_name: string;
    race_date: Date;
    circuit: { name: string; country: string | null };
    podium: Array<{ position: number; driver: string }>;
    results: Array<{ position: number; driver: string; points: number }>;
  }>;
  seasonStats: {
    raceCount: number;
    completedRaces: number;
    pointsAwarded: number;
    calendarPartial?: boolean;
  };
  news: NewsItem[];
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function StandingsTable({
  title,
  rows,
  emptyHint,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  rows: StandingRow[];
  emptyHint: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <article className="bg-[#111] border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider">{title}</h2>
        {viewAllHref && rows.length > 0 && viewAllLabel && (
          <Link href={viewAllHref} className="text-xs font-mono text-[#E10600] hover:underline">
            {viewAllLabel}
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-white/40 font-mono">{emptyHint}</p>
      ) : (
        <div className="space-y-1 max-h-[420px] overflow-y-auto">
          {rows.map((row) => (
            <div key={row.position} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="font-mono text-white/30 w-5 text-right">{row.position}</span>
              {row.driverRef ? (
                <DriverAvatar
                  driverRef={row.driverRef}
                  name={row.label}
                  headshotUrl={row.headshotUrl}
                  size={24}
                />
              ) : (
                <TeamLogo
                  constructorRef={row.constructorRef}
                  name={row.label}
                  logoUrl={row.logoUrl}
                  color={row.color}
                  size={20}
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="truncate font-medium block">{row.label}</span>
                {row.sublabel && (
                  <span className="text-xs font-mono text-white/40">{row.sublabel}</span>
                )}
              </div>
              <span className="font-mono text-white/50 text-xs shrink-0">{row.points} pts</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export async function SeasonDashboard({
  seasonYear,
  standingsRound,
  standingsSource,
  nextRace,
  countdownSeconds,
  driverStandings,
  constructorStandings,
  recentResults,
  seasonStats,
  news,
}: SeasonDashboardProps) {
  const t = await getTranslations("Home");
  const standingsHint =
    standingsRound === 0
      ? t("standingsBeforeFirst")
      : standingsSource === "computed"
        ? t("standingsComputed", { round: standingsRound })
        : t("standingsOfficial", { round: standingsRound });

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-[#E10600] font-mono text-xs font-bold mb-1">{t("seasonLabel", { year: seasonYear })}</p>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">{t("title")}</h1>
          <p className="text-white/50 font-mono text-sm mt-1">{t("subtitle")}</p>
        </div>
        {nextRace && (
          <article className="bg-[#111] border border-white/10 rounded-lg px-5 py-4 min-w-[240px]">
            <p className="text-[10px] font-mono text-white/40 uppercase">{t("nextRace")}</p>
            <p className="font-display text-lg font-bold mt-1">{nextRace.race_name}</p>
            <p className="text-xs font-mono text-white/50 mt-1">
              R{nextRace.round} · {nextRace.circuit.name}
            </p>
            <p className="text-xs font-mono text-[#E10600] mt-2">{formatCountdown(countdownSeconds)}</p>
            <Link
              href={`/f1/seasons/${seasonYear}/${nextRace.round}`}
              className="inline-block mt-3 text-xs font-mono text-[#E10600] hover:underline"
            >
              {t("raceDetails")}
            </Link>
          </article>
        )}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="Season statistics">
        {[
          {
            label: t("racesScheduled"),
            value: seasonStats.raceCount,
          },
          {
            label: t("completed"),
            value:
              seasonStats.calendarPartial && seasonStats.raceCount > seasonStats.completedRaces
                ? t("completedOfTotal", {
                    completed: seasonStats.completedRaces,
                    total: seasonStats.raceCount,
                  })
                : seasonStats.completedRaces,
          },
          { label: t("pointsAwarded"), value: Math.round(seasonStats.pointsAwarded) },
          { label: t("standingsRound"), value: standingsRound || "—" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111] border border-white/10 rounded-lg p-4 text-center">
            <p className="text-[10px] font-mono text-white/40 uppercase">{stat.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </section>

      <p className="text-xs font-mono text-white/30 -mt-4">{standingsHint}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StandingsTable
          title={t("driversChampionship")}
          rows={driverStandings}
          emptyHint={t("noDriverStandings")}
          viewAllHref={`/f1/drivers?season=${seasonYear}`}
          viewAllLabel={t("viewAll")}
        />
        <StandingsTable
          title={t("constructorsChampionship")}
          rows={constructorStandings}
          emptyHint={t("noConstructorStandings")}
          viewAllHref={`/f1/constructors?season=${seasonYear}`}
          viewAllLabel={t("viewAll")}
        />
      </div>

      <article className="bg-[#111] border border-white/10 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider">{t("recentResults")}</h2>
          <Link href={`/f1/seasons/${seasonYear}`} className="text-xs font-mono text-[#E10600] hover:underline">
            {t("fullSeason")}
          </Link>
        </div>
        {recentResults.length === 0 ? (
          <p className="text-sm text-white/40 font-mono">{t("noRecentResults")}</p>
        ) : (
          <div className="space-y-4">
            {recentResults.map((race) => (
              <Link
                key={race.round}
                href={`/f1/seasons/${seasonYear}/${race.round}`}
                className="block hover:bg-white/5 rounded-lg p-3 -mx-3 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[#E10600] font-mono text-xs">R{race.round}</span>
                    <p className="font-medium">{race.race_name}</p>
                    <p className="text-xs text-white/40">{race.circuit.name}</p>
                  </div>
                  <span className="text-xs font-mono text-white/40">
                    {new Date(race.race_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-white/60">
                  {race.results.slice(0, 5).map((r) => (
                    <span key={r.position}>
                      P{r.position} {r.driver}
                      {r.points > 0 ? ` (${r.points})` : ""}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </article>

      {news.length > 0 && (
        <article className="bg-[#111] border border-white/10 rounded-lg p-5">
          <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider mb-4">
            {t("newsChanges")}
          </h2>
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.title} className="border-l-2 border-[#E10600]/40 pl-4">
                <div className="flex flex-wrap gap-2 items-center mb-1">
                  <span className="text-[10px] font-mono text-[#E10600]">{item.category}</span>
                  <span className="text-[10px] font-mono text-white/30">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-sm text-white/50 mt-1">{item.summary}</p>
              </div>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}

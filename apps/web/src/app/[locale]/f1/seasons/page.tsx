import { getSeasons } from "@/lib/data/archives/seasons";
import { getCurrentSeasonRecord } from "@/lib/data/current/season";
import { CURRENT_SEASON } from "@/lib/config";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "F1 Seasons — UnderCut",
  description: "Browse current and historical Formula 1 seasons, calendars, and champions.",
  path: "/f1/seasons",
});

export default async function SeasonsPage() {
  const t = await getTranslations("Seasons");
  const [seasons, currentSeason] = await Promise.all([
    getSeasons(),
    getCurrentSeasonRecord(),
  ]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: "F1", href: "/f1/seasons" }, { label: t("title") }]}
      />

      <Link
        href={`/f1/seasons/${CURRENT_SEASON}`}
        className="block bg-[#E10600]/10 border border-[#E10600]/40 rounded-lg p-5 mb-8 hover:bg-[#E10600]/20 transition-all"
      >
        <p className="text-[#E10600] font-mono text-xs font-bold mb-1">{t("currentSeason")}</p>
        <p className="font-display text-2xl font-bold">{CURRENT_SEASON}</p>
        {currentSeason?.total_races && (
          <p className="text-xs font-mono text-white/50 mt-1">
            {t("racesScheduled", { count: currentSeason.total_races })}
          </p>
        )}
      </Link>

      <p className="text-white/40 font-mono text-xs mb-4 uppercase tracking-wider">{t("historicalSeasons")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {seasons.map((s) => (
          <Link
            key={s.year}
            href={`/f1/seasons/${s.year}`}
            className="bg-[#111] border border-white/10 rounded-lg p-4 sm:p-5 hover:bg-[#222] hover:border-[#E10600]/50 transition-all group min-h-[44px]"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-display text-xl sm:text-2xl font-bold text-white group-hover:text-[#E10600] transition-colors">
                {s.year}
              </div>
              {s.total_races && (
                <div className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded">
                  {s.total_races} RACES
                </div>
              )}
            </div>

            <div className="space-y-1 mt-4">
              {s.champion_driver && (
                <div className="text-xs text-white/70 flex items-center gap-2">
                  <span className="text-[#FFD700]">🏆</span>
                  <span className="truncate">{s.champion_driver.full_name}</span>
                </div>
              )}
              {s.champion_constructor && (
                <div className="text-[10px] text-white/50 flex items-center gap-2 pl-5">
                  <span className="truncate">{s.champion_constructor.name}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

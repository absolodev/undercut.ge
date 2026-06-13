import { getSeasonOverview } from "@/lib/data/archives/seasons";
import { CURRENT_SEASON } from "@/lib/config";
import { UI_MIN_SEASON } from "@/lib/season";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";

import { buildSeasonMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { getLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const locale = (await getLocale()) as Locale;
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) return { title: "Season — UnderCut" };
  return buildSeasonMetadata({ year: yearNum, locale });
}

export default async function SeasonOverviewPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);

  if (isNaN(year) || year < 1950 || year > CURRENT_SEASON + 1) {
    notFound();
  }

  const races = await getSeasonOverview(year);

  if (!races || races.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/f1/seasons" className="text-[#E10600] text-sm hover:underline font-mono mb-2 inline-block">
            ← BACK TO SEASONS
          </Link>
          <h1 className="font-display text-4xl font-bold">{year} Season</h1>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-lg p-12 text-center max-w-3xl mx-auto">
          <div className="text-5xl mb-4">🏁</div>
          <h2 className="text-xl font-bold text-white mb-2 font-display">No Race Data Loaded</h2>
          <p className="text-white/50 text-sm max-w-md mx-auto mb-6">
            We currently only have complete historical race results and standings loaded for seasons {UI_MIN_SEASON} through {CURRENT_SEASON - 1}.
          </p>
          <div className="flex gap-4 justify-center">
            {CURRENT_SEASON > UI_MIN_SEASON && (
              <Link
                href={`/f1/seasons/${CURRENT_SEASON - 1}`}
                className="bg-[#E10600] hover:bg-[#c10500] text-white px-5 py-2.5 rounded text-sm font-semibold transition-all font-mono"
              >
                VIEW {CURRENT_SEASON - 1} SEASON
              </Link>
            )}
            {CURRENT_SEASON > UI_MIN_SEASON + 1 && (
              <Link
                href={`/f1/seasons/${CURRENT_SEASON - 2}`}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded text-sm font-semibold transition-all font-mono border border-white/10"
              >
                VIEW {CURRENT_SEASON - 2} SEASON
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/f1/seasons" className="text-[#E10600] text-sm hover:underline font-mono mb-2 inline-block">
          ← BACK TO SEASONS
        </Link>
        <h1 className="font-display text-4xl font-bold">{year} Season Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {races.map((race) => {
          const raceSession = race.sessions.find(s => s.session_type === "R");
          const podium = raceSession?.results || [];

          return (
            <Link
              key={race.id}
              href={`/f1/seasons/${year}/${race.round}`}
              className="bg-[#111] border border-white/10 rounded-lg p-5 hover:bg-[#222] hover:border-white/30 transition-all flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[#E10600] font-mono text-xs font-bold mb-1">ROUND {race.round}</div>
                  <h2 className="font-display text-xl font-bold text-white mb-1">{race.race_name}</h2>
                  <div className="text-white/50 text-xs font-mono">{new Date(race.race_date).toLocaleDateString()}</div>
                </div>
                {race.circuit?.country_code && (
                  <div className="text-2xl" title={race.circuit.country || ""}>
                    {/* Placeholder for flag */}
                    🏁
                  </div>
                )}
              </div>

              <div className="flex-1" />

              <div className="bg-black/50 rounded p-3 mt-4 space-y-2">
                <div className="text-xs text-white/30 font-mono mb-2 uppercase tracking-wider">Podium</div>
                {podium.length > 0 ? podium.map((res) => (
                  <div key={res.driver_id} className="flex items-center gap-3 text-sm">
                    <span className="text-white/50 font-mono w-4">{res.finish_position}</span>
                    <div 
                      className="w-1.5 h-4 rounded-sm" 
                      style={{ backgroundColor: res.constructor.color_primary || "#888" }} 
                    />
                    <span className="font-semibold">{res.driver.last_name}</span>
                  </div>
                )) : (
                  <div className="text-white/30 text-xs italic">Results not available</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

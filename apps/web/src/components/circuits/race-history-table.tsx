"use client";

import { Link } from "@/i18n/navigation";

export function RaceHistoryTable({ races }: { races: any[] }) {
  if (!races || races.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-4">Race History</h2>
      <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
            <tr>
              <th className="p-3 w-20">YEAR</th>
              <th className="p-3">RACE</th>
              <th className="p-3">WINNER</th>
              <th className="p-3">CONSTRUCTOR</th>
              <th className="p-3 text-right">ARCHIVE</th>
            </tr>
          </thead>
          <tbody>
            {races.map((r) => {
              const raceSession = r.sessions?.find((s: any) => s.session_type === "R");
              const winner = raceSession?.results?.[0];

              return (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-mono font-bold">{r.season_year}</td>
                  <td className="p-3 font-semibold">{r.race_name}</td>
                  <td className="p-3 text-white/70">
                    {winner ? winner.driver.full_name : <span className="italic text-white/30">N/A</span>}
                  </td>
                  <td className="p-3">
                    {winner ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: winner.constructor.color_primary || "#888" }} />
                        <span className="text-white/70">{winner.constructor.name}</span>
                      </div>
                    ) : <span className="italic text-white/30">N/A</span>}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/f1/seasons/${r.season_year}/${r.round}`} className="text-[#E10600] hover:underline font-mono text-xs">
                      VIEW →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

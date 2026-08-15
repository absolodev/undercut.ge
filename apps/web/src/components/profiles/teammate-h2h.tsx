import { getDriverTeammateH2H } from "@/lib/data/drivers-profile";
import { Link } from "@/i18n/navigation";

interface TeammateH2HProps {
  driverId: string | number;
}

export async function TeammateH2H({ driverId }: TeammateH2HProps) {
  const numericId = typeof driverId === "string" ? parseInt(driverId, 10) : driverId;
  const teammates = await getDriverTeammateH2H(numericId);

  if (!teammates || teammates.length === 0) {
    return null;
  }

  const totalTeammateRaces = teammates.reduce((acc, t) => acc + t.races_together, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold">Teammate Head-to-Head</h2>
          <p className="text-white/50 font-mono text-xs mt-0.5">
            Direct comparison against teammates in equal machinery ({teammates.length} pairings · {totalTeammateRaces} total races). Format: <span className="text-white/80 font-bold">[This Driver]</span> vs <span className="text-white/50">[Teammate]</span>.
          </p>
        </div>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 font-mono text-[11px] text-white/50 uppercase border-b border-white/10">
              <tr>
                <th className="p-3.5 pl-5">Teammate</th>
                <th className="p-3.5">Team & Era</th>
                <th className="p-3.5 text-center">GPs</th>
                <th className="p-3.5 text-center" title="How many times this driver finished ahead of their teammate in races">
                  Race Finish H2H
                </th>
                <th className="p-3.5 text-center" title="How many times this driver outqualified their teammate">
                  Qualifying H2H
                </th>
                <th className="p-3.5 text-center">Wins</th>
                <th className="p-3.5 text-center">Podiums</th>
                <th className="p-3.5 text-right pr-5">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {teammates.map((item) => {
                const totalRacesFinished = item.races_ahead + item.races_behind;
                const raceWinPct =
                  totalRacesFinished > 0
                    ? Math.round((item.races_ahead / totalRacesFinished) * 100)
                    : 50;

                const isLeaderInRaces = item.races_ahead > item.races_behind;
                const isLeaderInQuali = item.quali_ahead > item.quali_behind;
                const isLeaderInPoints = item.driver_points > item.teammate_points;

                const yearSpan =
                  item.first_year === item.last_year
                    ? `${item.first_year}`
                    : `${item.first_year}–${item.last_year}`;

                return (
                  <tr
                    key={`${item.teammate_id}-${item.first_year}`}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-3.5 pl-5 font-sans">
                      <Link
                        href={`/f1/drivers/${item.teammate_ref}`}
                        className="font-bold text-white hover:text-[#E10600] transition-colors flex items-center gap-1.5"
                      >
                        {item.teammate_name}
                        <span className="text-[10px] text-white/40 font-mono">→</span>
                      </Link>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-col">
                        <span className="text-white/80 font-sans font-medium text-xs">
                          {item.teams}
                        </span>
                        <span className="text-[11px] text-white/40">{yearSpan}</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-bold text-white/90">
                      {item.races_together}
                    </td>

                    <td className="p-3.5" title={`Finished ahead ${item.races_ahead} times vs ${item.races_behind} times behind`}>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`font-bold ${
                              isLeaderInRaces ? "text-emerald-400" : "text-white/70"
                            }`}
                          >
                            {item.races_ahead}
                          </span>
                          <span className="text-white/30">–</span>
                          <span
                            className={`font-bold ${
                              !isLeaderInRaces && item.races_behind > item.races_ahead
                                ? "text-emerald-400"
                                : "text-white/50"
                            }`}
                          >
                            {item.races_behind}
                          </span>
                        </div>
                        {totalRacesFinished > 0 && (
                          <div className="w-20 bg-white/10 h-1.5 rounded-full overflow-hidden flex" title={`${raceWinPct}% ahead in races`}>
                            <div
                              className="bg-[#E10600] h-full"
                              style={{ width: `${raceWinPct}%` }}
                            />
                            <div
                              className="bg-white/20 h-full"
                              style={{ width: `${100 - raceWinPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-center" title={`Outqualified teammate ${item.quali_ahead} times vs ${item.quali_behind} times`}>
                      <span
                        className={`font-bold ${
                          isLeaderInQuali ? "text-emerald-400" : "text-white/70"
                        }`}
                      >
                        {item.quali_ahead}
                      </span>
                      <span className="text-white/30 mx-1.5">–</span>
                      <span
                        className={`font-bold ${
                          !isLeaderInQuali && item.quali_behind > item.quali_ahead
                            ? "text-emerald-400"
                            : "text-white/50"
                        }`}
                      >
                        {item.quali_behind}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="font-bold text-white/90">{item.driver_wins}</span>
                      <span className="text-white/30 mx-1.5">vs</span>
                      <span className="text-white/50">{item.teammate_wins}</span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="font-bold text-white/90">{item.driver_podiums}</span>
                      <span className="text-white/30 mx-1.5">vs</span>
                      <span className="text-white/50">{item.teammate_podiums}</span>
                    </td>

                    <td className="p-3.5 text-right pr-5">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isLeaderInPoints ? "text-emerald-400" : "text-white/90"
                            }`}
                          >
                            {item.driver_points.toLocaleString()}
                          </span>
                          <span className="text-white/30">vs</span>
                          <span className="text-white/50">
                            {item.teammate_points.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

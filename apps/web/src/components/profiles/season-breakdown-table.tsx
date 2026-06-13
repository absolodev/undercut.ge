import { TeamLogo } from "@/components/ui/team-logo";
import { resolveConstructorColor } from "@/lib/assets/constructors";

export function SeasonBreakdownTable({ seasons }: { seasons: any }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-4">Season Breakdown</h2>
      <div className="bg-[#111] rounded-lg border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
            <tr>
              <th className="p-3">YEAR</th>
              <th className="p-3">CONSTRUCTOR</th>
              <th className="p-3 text-right">POS</th>
              <th className="p-3 text-right">RACES</th>
              <th className="p-3 text-right">WINS</th>
              <th className="p-3 text-right">PODIUMS</th>
              <th className="p-3 text-right">PTS</th>
            </tr>
          </thead>
          <tbody>
            {(seasons as any[]).map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 font-mono font-bold">{row.year}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <TeamLogo
                      constructorRef={row.constructor_ref}
                      name={row.team}
                      color={resolveConstructorColor(row.constructor_ref, row.team_color)}
                      size={18}
                    />
                    <span>{row.team}</span>
                  </div>
                </td>
                <td className="p-3 font-mono font-bold text-white/70 text-right">{row.championship_position || "-"}</td>
                <td className="p-3 font-mono text-white/50 text-right">{Number(row.races)}</td>
                <td className="p-3 font-mono text-white/70 text-right">{Number(row.wins)}</td>
                <td className="p-3 font-mono text-white/70 text-right">{Number(row.podiums)}</td>
                <td className="p-3 font-mono font-bold text-[#E10600] text-right">{Number(row.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

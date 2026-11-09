import { Link } from "@/i18n/navigation";

export type RecentResult = {
  year: number;
  round: number;
  race_name: string;
  constructor_name: string;
  grid_position: number | null;
  finish_position: number | null;
  position_text: string | null;
  points: number;
  fastest_lap: boolean;
};

export function RecentResults({ results }: { results: RecentResult[] }) {
  if (results.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-4">Last 15 Starts</h2>
      <div className="bg-[#111] rounded-lg border border-white/10 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
            <tr>
              <th className="p-3">YEAR</th>
              <th className="p-3">RACE</th>
              <th className="p-3">CONSTRUCTOR</th>
              <th className="p-3 text-right">GRID</th>
              <th className="p-3 text-right">FINISH</th>
              <th className="p-3 text-right">PTS</th>
              <th className="p-3 text-right">FL</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={`${row.year}-${row.round}`} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 font-mono">{row.year}</td>
                <td className="p-3">
                  <Link href={`/f1/seasons/${row.year}/${row.round}`} className="hover:text-[#E10600]">
                    {row.race_name}
                  </Link>
                </td>
                <td className="p-3 text-white/70">{row.constructor_name}</td>
                <td className="p-3 font-mono text-right">{row.grid_position && row.grid_position > 0 ? row.grid_position : "—"}</td>
                <td className="p-3 font-mono text-right">{row.finish_position ?? row.position_text ?? "—"}</td>
                <td className="p-3 font-mono text-right">{row.points}</td>
                <td className="p-3 font-mono text-right text-[#b026ff]">{row.fastest_lap ? "FL" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

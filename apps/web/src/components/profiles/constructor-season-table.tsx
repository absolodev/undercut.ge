import { Link } from "@/i18n/navigation";
import type { ConstructorSeasonRow } from "@/lib/data/constructors-profile";

type Labels = {
  title: string;
  empty: string;
  year: string;
  position: string;
  wins: string;
  podiums: string;
  points: string;
  lineup: string;
};

export function ConstructorSeasonTable({
  seasons,
  labels,
}: {
  seasons: ConstructorSeasonRow[];
  labels: Labels;
}) {
  if (!seasons.length) {
    return (
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">{labels.title}</h2>
        <p className="text-sm text-white/40 font-mono py-8 text-center bg-[#111] border border-dashed border-white/20 rounded-lg">
          {labels.empty}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-4">{labels.title}</h2>
      <div className="bg-[#111] rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[560px]">
            <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
              <tr>
                <th className="p-3">{labels.year}</th>
                <th className="p-3 text-right">{labels.position}</th>
                <th className="p-3 text-right">{labels.wins}</th>
                <th className="p-3 text-right">{labels.podiums}</th>
                <th className="p-3 text-right">{labels.points}</th>
                <th className="p-3">{labels.lineup}</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((row) => (
                <tr key={row.year} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <Link
                      href={`/f1/seasons/${row.year}`}
                      className="font-mono font-bold hover:text-[#E10600] transition-colors"
                    >
                      {row.year}
                    </Link>
                  </td>
                  <td className="p-3 font-mono font-bold text-white/70 text-right">
                    {row.position != null ? `P${row.position}` : "—"}
                  </td>
                  <td className="p-3 font-mono text-right">{row.wins}</td>
                  <td className="p-3 font-mono text-right">{row.podiums}</td>
                  <td className="p-3 font-mono font-bold text-[#E10600] text-right">
                    {row.points}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {row.driver_refs.map((ref, i) => (
                        <Link
                          key={ref}
                          href={`/f1/drivers/${ref}`}
                          className="text-xs text-white/60 hover:text-[#E10600] transition-colors"
                        >
                          {row.drivers[i] ?? ref}
                          {i < row.driver_refs.length - 1 ? "," : ""}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

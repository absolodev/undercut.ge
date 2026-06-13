"use client";

import { useMemo } from "react";

function parseFinishPosition(result: {
  finish_position: number | null;
  position_text: string | null;
}): number | null {
  if (result.finish_position != null) return result.finish_position;
  if (result.position_text && /^\d+$/.test(result.position_text)) {
    return parseInt(result.position_text, 10);
  }
  return null;
}

export function GridVsFinish({ results }: { results: any[] }) {
  const data = useMemo(() => {
    return results
      .map((r) => {
        const grid = r.grid_position;
        const finish = parseFinishPosition(r);
        if (grid == null || finish == null) return null;
        return {
          id: r.id,
          driver: r.driver.broadcast_name,
          teamColor: r.constructor?.color_primary || "#888",
          grid,
          finish,
          delta: grid - finish,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => a.grid - b.grid);
  }, [results]);

  const maxPosition = useMemo(() => {
    if (!data.length) return 20;
    return Math.max(...data.flatMap((d) => [d.grid, d.finish]));
  }, [data]);

  if (!data.length) {
    return (
      <div className="p-8 text-center text-white/50 font-mono text-xs">
        No grid vs finish data available
      </div>
    );
  }

  const rowHeight = 36;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
          <tr>
            <th className="p-3 w-12 text-center">GRID</th>
            <th className="p-3">DRIVER</th>
            <th className="p-3 w-[45%]">CHANGE</th>
            <th className="p-3 w-12 text-center">FINISH</th>
            <th className="p-3 w-16 text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => {
            const gridPct = ((d.grid - 0.5) / maxPosition) * 100;
            const finishPct = ((d.finish - 0.5) / maxPosition) * 100;
            const isGain = d.delta > 0;
            const isLoss = d.delta < 0;

            return (
              <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 text-center font-mono font-bold">{d.grid}</td>
                <td className="p-3 font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: d.teamColor }}
                    />
                    {d.driver}
                  </div>
                </td>
                <td className="p-3">
                  <div className="relative h-6 bg-white/5 rounded-full overflow-visible">
                    <svg
                      className="absolute inset-0 w-full h-full overflow-visible"
                      viewBox={`0 0 100 ${rowHeight}`}
                      preserveAspectRatio="none"
                    >
                      <line
                        x1={gridPct}
                        y1={rowHeight / 2}
                        x2={finishPct}
                        y2={rowHeight / 2}
                        stroke={d.teamColor}
                        strokeWidth="2"
                        strokeOpacity="0.7"
                      />
                      <circle cx={gridPct} cy={rowHeight / 2} r="3" fill={d.teamColor} />
                      <circle cx={finishPct} cy={rowHeight / 2} r="3" fill={d.teamColor} />
                    </svg>
                  </div>
                </td>
                <td className="p-3 text-center font-mono font-bold">{d.finish}</td>
                <td className="p-3 text-right font-mono text-xs">
                  {isGain && <span className="text-[#00FF00]">+{d.delta}</span>}
                  {isLoss && <span className="text-[#E10600]">{d.delta}</span>}
                  {!isGain && !isLoss && <span className="text-white/30">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

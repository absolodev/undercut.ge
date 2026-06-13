"use client";

import { formatLapTime } from "@pitwall/utils";

export function PitStopSummary({ pitStops }: { pitStops: any[] }) {
  if (!pitStops || pitStops.length === 0) {
    return <div className="p-8 text-center text-white/50 font-mono text-xs">No pit stop data available</div>;
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
          <tr>
            <th className="p-3">LAP</th>
            <th className="p-3">DRIVER</th>
            <th className="p-3">STOP #</th>
            <th className="p-3 text-right">DURATION</th>
            <th className="p-3 text-right">TOTAL TIME</th>
          </tr>
        </thead>
        <tbody>
          {pitStops.map((p) => (
            <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 font-mono text-xs">
              <td className="p-3 text-white/50">{p.lap_number}</td>
              <td className="p-3 font-semibold">{p.driver.broadcast_name}</td>
              <td className="p-3 text-white/50">{p.stop_number}</td>
              <td className="p-3 text-right font-bold text-sector-yellow">{p.duration_ms ? (p.duration_ms / 1000).toFixed(2) : "—"}s</td>
              <td className="p-3 text-right text-white/50">{p.pit_lane_time_ms ? formatLapTime(p.pit_lane_time_ms) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

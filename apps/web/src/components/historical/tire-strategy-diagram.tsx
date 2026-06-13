"use client";

import { useMemo } from "react";
import { TIRE_COLORS } from "@pitwall/constants";

export function TireStrategyDiagram({ stints, totalLaps }: { stints: any[], totalLaps: number }) {
  const driverStints = useMemo(() => {
    if (!stints) return [];
    
    // Group by driver
    const grouped = new Map<number, { driver: any; stints: any[] }>();
    
    stints.forEach(s => {
      if (!grouped.has(s.driver_id)) {
        grouped.set(s.driver_id, { driver: s.driver, stints: [] });
      }
      grouped.get(s.driver_id)?.stints.push(s);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      // Sort by whoever finished highest (assume stint length correlates or just sort by name for now)
      return a.driver.last_name.localeCompare(b.driver.last_name);
    });
  }, [stints]);

  if (!stints || stints.length === 0) {
    return <div className="p-8 text-center text-white/50 font-mono border border-dashed border-white/10 rounded-lg bg-[#111]">No tire strategy data available.</div>;
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header timeline */}
        <div className="flex ml-32 mb-4 relative h-4">
          {Array.from({ length: 11 }).map((_, i) => {
            const lapMark = Math.floor((i / 10) * totalLaps);
            return (
              <div key={i} className="absolute text-[10px] font-mono text-white/30 -translate-x-1/2" style={{ left: `${(i / 10) * 100}%` }}>
                {lapMark}
              </div>
            );
          })}
        </div>

        {/* Driver Rows */}
        <div className="space-y-3">
          {driverStints.map(({ driver, stints: drvStints }) => (
            <div key={driver.id} className="flex items-center gap-4 h-6">
              <div className="w-28 shrink-0 font-semibold text-sm truncate text-right">
                {driver.broadcast_name || driver.last_name}
              </div>
              <div className="flex-1 h-full bg-white/5 rounded-full relative overflow-hidden">
                {drvStints.map((s, i) => {
                  const endLap = s.end_lap || totalLaps;
                  const startPct = (s.start_lap / totalLaps) * 100;
                  const widthPct = ((endLap - s.start_lap) / totalLaps) * 100;
                  const color = TIRE_COLORS[s.compound as keyof typeof TIRE_COLORS] || "#888";
                  
                  return (
                    <div 
                      key={s.id}
                      className="absolute h-full border-r border-black/50 last:border-0"
                      style={{ 
                        left: `${startPct}%`, 
                        width: `${widthPct}%`,
                        backgroundColor: color,
                        opacity: 0.9
                      }}
                      title={`${s.compound}: L${s.start_lap} - L${endLap}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

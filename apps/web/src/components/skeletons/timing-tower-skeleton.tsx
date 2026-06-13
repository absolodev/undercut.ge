"use client";

import { cn } from "@/lib/utils";

export function TimingTowerSkeleton() {
  // Render 20 placeholder rows
  const placeholderRows = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full bg-black text-white select-none animate-pulse">
      {/* Column headers (identical layout) */}
      <div className="flex items-center h-7 px-1 border-b border-white/10 text-[10px] text-white/30 font-mono uppercase tracking-wider shrink-0">
        <span className="w-[30px] text-center">POS</span>
        <span className="w-[4px]" />
        <span className="w-[50px] pl-1">DRV</span>
        <span className="w-[70px] text-right">GAP</span>
        <span className="w-[60px] text-right">INT</span>
        <span className="w-[80px] text-right">LAST</span>
        <span className="w-[50px] text-right">S1</span>
        <span className="w-[50px] text-right">S2</span>
        <span className="w-[50px] text-right">S3</span>
        <span className="w-[30px] text-center">TYR</span>
        <span className="w-[25px] text-center">AGE</span>
        <span className="w-[20px] text-center">PT</span>
        <span className="w-[20px] text-center">⚠️</span>
      </div>

      {/* Loading rows */}
      <div className="flex-1 overflow-y-auto">
        {placeholderRows.map((pos) => (
          <div
            key={pos}
            className="flex items-center h-[28px] border-b border-white/5 opacity-50"
          >
            {/* Position */}
            <div className="w-[30px] flex items-center justify-center">
              <span className="font-mono text-xs text-white/20 font-semibold">{pos}</span>
            </div>

            {/* Team stripe placeholder */}
            <div className="w-[4px] h-full bg-white/10" />

            {/* Driver code */}
            <div className="w-[50px] pl-1">
              <div className="h-3 w-8 bg-white/10 rounded" />
            </div>

            {/* Gap */}
            <div className="w-[70px] flex justify-end pr-1">
              <div className="h-3 w-12 bg-white/10 rounded" />
            </div>

            {/* Interval */}
            <div className="w-[60px] flex justify-end pr-1">
              <div className="h-3 w-10 bg-white/10 rounded" />
            </div>

            {/* Last Lap */}
            <div className="w-[80px] flex justify-end pr-1">
              <div className="h-3 w-14 bg-white/10 rounded" />
            </div>

            {/* Sectors */}
            <div className="w-[50px] flex justify-end pr-1"><div className="h-3 w-8 bg-white/5 rounded" /></div>
            <div className="w-[50px] flex justify-end pr-1"><div className="h-3 w-8 bg-white/5 rounded" /></div>
            <div className="w-[50px] flex justify-end pr-1"><div className="h-3 w-8 bg-white/5 rounded" /></div>

            {/* Compound */}
            <div className="w-[30px] flex justify-center">
              <div className="h-3.5 w-3.5 rounded-full bg-white/10" />
            </div>

            {/* Age */}
            <div className="w-[25px] flex justify-center">
              <div className="h-3 w-4 bg-white/10 rounded" />
            </div>

            {/* Pit count */}
            <div className="w-[20px] flex justify-center">
              <div className="h-3 w-3 bg-white/10 rounded" />
            </div>

            {/* Penalties */}
            <div className="w-[20px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

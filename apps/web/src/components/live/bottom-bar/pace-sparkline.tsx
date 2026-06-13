"use client";

import { useStandingsStore } from "@pitwall/stores";
import { useMemo } from "react";

export function PaceSparkline() {
  const standings = useStandingsStore((s) => s.standings);
  const leader = standings[0];

  // Simple SVG polyline sparkline of last N lap times
  // In production, track historical lap times in store
  const points = useMemo(() => {
    // Placeholder — would track leader's last 10 laps
    return "0,20 10,18 20,15 30,16 40,14 50,15 60,13 70,14 80,12 90,13";
  }, [leader]);

  return (
    <div className="shrink-0">
      <div className="text-[9px] text-text-muted uppercase mb-0.5">Leader Pace</div>
      <svg width="100" height="24" viewBox="0 0 100 24">
        <polyline
          points={points}
          fill="none"
          stroke="#00ff00"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

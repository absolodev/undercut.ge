"use client";

import { useSpeedTrapStore } from "@pitwall/stores";

export function SpeedTrapWidget() {
  const topSpeeds = useSpeedTrapStore((s) => s.topSpeeds);

  return (
    <div className="shrink-0">
      <div className="text-[9px] text-text-muted uppercase mb-0.5">Speed Trap</div>
      <div className="flex gap-3 text-[10px] font-mono">
        {topSpeeds.slice(0, 3).map((s, i) => (
          <span key={s.driverNumber}>
            <span className="text-text-muted">{i + 1}.</span>{" "}
            <span className="font-semibold">{s.broadcastName}</span>{" "}
            <span className="text-sector-green">{s.speed}</span>
          </span>
        ))}
        {topSpeeds.length === 0 && <span className="text-text-muted">WAITING FOR DATA...</span>}
      </div>
    </div>
  );
}

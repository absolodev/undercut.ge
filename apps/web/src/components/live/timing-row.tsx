"use client";

import { cn } from "@/lib/utils";
import { formatLapTime, formatGap } from "@pitwall/utils";
import { TIRE_COLORS } from "@pitwall/constants";
import type { LiveStanding } from "@pitwall/types";
import { PenaltyBadge } from "./penalty-badge";
import { TireCompoundIcon } from "./tire-compound-icon";
import { SectorTime } from "./sector-time";
import { useUIStore } from "@pitwall/stores";

interface TimingRowProps {
  standing: LiveStanding;
  positionDelta: number; // +1 = gained, -1 = lost, 0 = unchanged
}

export function TimingRow({ standing, positionDelta }: TimingRowProps) {
  const setSelectedDriver = useUIStore((s) => s.setSelectedDriver);

  return (
    <div
      className={cn(
        "flex items-center h-[28px] border-b border-border-default hover:bg-bg-elevated cursor-pointer transition-colors duration-100",
        standing.isInPit && "opacity-60 bg-bg-surface",
        standing.isRetired && "opacity-30",
        standing.hasFastestLap && "border-l-2 border-l-sector-purple"
      )}
      onClick={() => setSelectedDriver(standing.driverNumber)}
    >
      {/* Position + delta arrow */}
      <div className="w-[30px] flex items-center justify-center gap-0.5">
        <span className="font-mono text-xs font-semibold">{standing.position}</span>
        {positionDelta > 0 && <span className="text-[8px] text-green-400">▲</span>}
        {positionDelta < 0 && <span className="text-[8px] text-red-400">▼</span>}
      </div>

      {/* Team color stripe */}
      <div
        className="w-[4px] h-full"
        style={{ backgroundColor: standing.teamColor }}
      />

      {/* Driver code */}
      <div className="w-[50px] pl-1 font-mono text-xs font-bold truncate">
        {standing.broadcastName}
      </div>

      {/* Gap to leader */}
      <div className="w-[70px] text-right font-mono text-xs tabular-nums">
        {standing.position === 1 ? (
          <span className="text-text-muted">LEADER</span>
        ) : standing.isInPit ? (
          <span className="text-yellow-400 font-semibold">PIT</span>
        ) : (
          formatGap(standing.gapToLeader)
        )}
      </div>

      {/* Interval to car ahead */}
      <div className={cn(
        "w-[60px] text-right font-mono text-xs tabular-nums",
        standing.interval && parseFloat(standing.interval) < 1 && parseFloat(standing.interval) > 0 && "text-flag-green"
      )}>
        {standing.position === 1 ? "—" : formatGap(standing.interval)}
        {/* DRS indicator when within 1s */}
        {standing.interval && parseFloat(standing.interval) > 0 && parseFloat(standing.interval) < 1 && (
          <span className="ml-0.5 text-[7px] text-flag-green font-bold">DRS</span>
        )}
      </div>

      {/* Last lap time */}
      <div className="w-[80px] text-right font-mono text-xs tabular-nums">
        {standing.lastLapMs ? formatLapTime(standing.lastLapMs) : "—"}
      </div>

      {/* Sector times */}
      <SectorTime value={standing.sector1Ms} width="w-[50px]" />
      <SectorTime value={standing.sector2Ms} width="w-[50px]" />
      <SectorTime value={standing.sector3Ms} width="w-[50px]" />

      {/* Tire compound */}
      <div className="w-[30px] flex justify-center">
        {standing.compound && <TireCompoundIcon compound={standing.compound} size={14} />}
      </div>

      {/* Tire age */}
      <div className="w-[25px] text-center font-mono text-[10px] text-text-secondary">
        {standing.tyreAge || "—"}
      </div>

      {/* Pit count */}
      <div className="w-[20px] text-center font-mono text-[10px] text-text-secondary">
        {standing.pitStops}
      </div>

      {/* Penalty badge */}
      <div className="w-[20px] flex justify-center">
        {standing.penalties.length > 0 && (
          <PenaltyBadge penalties={standing.penalties} driverName={standing.broadcastName} />
        )}
      </div>
    </div>
  );
}

"use client";

import { useStandingsStore } from "@pitwall/stores";
import { useState } from "react";

export function PitWindowCalculator() {
  const standings = useStandingsStore((s) => s.standings);
  const [selectedDriver, setSelectedDriver] = useState<number>(standings[0]?.driverNumber || 1);

  const driver = standings.find((s) => s.driverNumber === selectedDriver);
  const driverIdx = standings.findIndex((s) => s.driverNumber === selectedDriver);

  // Calculate pit window projections
  // pitLossTime comes from circuit data (typically 20-25 seconds)
  const pitLossTime = 22; // seconds — should be loaded from circuit config

  const carAhead = driverIdx > 0 ? standings[driverIdx - 1] : null;
  const carBehind = driverIdx < standings.length - 1 ? standings[driverIdx + 1] : null;

  const gapToAhead = carAhead ? parseFloat(driver?.interval || "0") : null;
  const gapToBehind = carBehind ? parseFloat(carBehind.interval || "0") : null;

  const exitsBehindAhead = gapToAhead !== null ? pitLossTime - gapToAhead : null;
  const exitsAheadOfBehind = gapToBehind !== null ? gapToBehind - pitLossTime : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">Driver:</span>
        <select
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(Number(e.target.value))}
          className="bg-bg-elevated text-xs border border-border-default rounded px-2 py-1"
        >
          {standings.map((s) => (
            <option key={s.driverNumber} value={s.driverNumber}>
              P{s.position} — {s.broadcastName}
            </option>
          ))}
        </select>
      </div>

      {driver && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-bg-elevated rounded p-3">
            <div className="text-text-muted mb-1">If pitting THIS lap:</div>
            {carAhead && (
              <div className={exitsBehindAhead! > 0 ? "text-flag-red" : "text-flag-green"}>
                Exits {exitsBehindAhead! > 0 ? `behind ${carAhead.broadcastName} by ${exitsBehindAhead!.toFixed(1)}s` : `ahead of ${carAhead.broadcastName}`}
              </div>
            )}
            {carBehind && (
              <div className={exitsAheadOfBehind! > 0 ? "text-flag-green" : "text-flag-red"}>
                Exits {exitsAheadOfBehind! > 0 ? `ahead of ${carBehind.broadcastName} by ${exitsAheadOfBehind!.toFixed(1)}s` : `behind ${carBehind.broadcastName}`}
              </div>
            )}
          </div>
          <div className="bg-bg-elevated rounded p-3">
            <div className="text-text-muted mb-1">Pit loss estimate</div>
            <div className="font-mono text-lg">{pitLossTime}s</div>
            <div className="text-text-muted text-[10px] mt-1">
              Undercut threat from {carBehind?.broadcastName}: possible if gap &lt; {pitLossTime}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

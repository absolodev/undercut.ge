"use client";

import { useStandingsStore } from "@pitwall/stores";
import { TimingRow } from "./timing-row";
import { TimingTowerControls } from "./timing-tower-controls";
import { AnimatePresence, motion } from "framer-motion";

export function TimingTower() {
  const standings = useStandingsStore((s) => s.standings);
  const previousPositions = useStandingsStore((s) => s.previousPositions);

  return (
    <div className="flex flex-col h-full">
      {/* Column headers */}
      <div className="flex items-center h-7 px-1 border-b border-border-default text-[10px] text-text-muted font-mono uppercase tracking-wider shrink-0">
        <span className="w-[30px] text-center">POS</span>
        <span className="w-[4px]" /> {/* Team color stripe */}
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

      {/* Driver rows with animated reordering */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {standings.map((standing) => {
            const prevPos = previousPositions.get(standing.driverNumber) ?? standing.position;
            const delta = prevPos - standing.position; // +1 = gained 1 place

            return (
              <motion.div
                key={standing.driverNumber}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
              >
                <TimingRow
                  standing={standing}
                  positionDelta={delta}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Column controls */}
      <TimingTowerControls />
    </div>
  );
}

"use client";

import { useUIStore } from "@pitwall/stores";
import { PitWindowCalculator } from "./pit-window-calculator";
import { PaceDeltaChart } from "./pace-delta-chart";
import { TireDegradationChart } from "./tire-degradation-chart";
import { RacePaceTable } from "./race-pace-table";
import { ChampionshipCalculator } from "./championship-calculator";
import { SectorComparison } from "./sector-comparison";
import { useState } from "react";

export function ProToolsOverlay() {
  const isProMode = useUIStore((s) => s.isProMode);
  const [activeTool, setActiveTool] = useState<string>("pit-window");

  if (!isProMode) return null;

  const tools = [
    { id: "pit-window", label: "Pit Window", icon: "⏱️" },
    { id: "pace-delta", label: "Pace Delta", icon: "📊" },
    { id: "tire-deg", label: "Tire Deg", icon: "🛞" },
    { id: "race-pace", label: "Race Pace", icon: "📋" },
    { id: "championship", label: "What-If", icon: "🏆" },
    { id: "sectors", label: "Sectors", icon: "⚡" },
  ];

  return (
    <div className="fixed bottom-24 left-[290px] right-[310px] z-40">
      {/* Tool tabs */}
      <div className="flex gap-1 mb-1">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            className={`px-2 py-1 text-[10px] rounded-t transition-colors ${
              activeTool === t.id
                ? "bg-bg-surface text-white border border-b-0 border-border-default"
                : "text-text-muted hover:text-text-secondary bg-[#111] border border-white/5"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tool panel */}
      <div className="bg-bg-surface/95 backdrop-blur-md border border-border-default rounded-lg p-4 max-h-[300px] overflow-y-auto">
        {activeTool === "pit-window" && <PitWindowCalculator />}
        {activeTool === "pace-delta" && <PaceDeltaChart />}
        {activeTool === "tire-deg" && <TireDegradationChart />}
        {activeTool === "race-pace" && <RacePaceTable />}
        {activeTool === "championship" && <ChampionshipCalculator />}
        {activeTool === "sectors" && <SectorComparison />}
      </div>
    </div>
  );
}

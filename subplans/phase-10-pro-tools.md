# Phase 10: Commentator & Analyst Pro Tools (Week 10-11)

## Overview
Build the Pro Mode overlay with 8 analyst tools: pit window calculator, pace delta chart, tire degradation curves, race pace table, command palette (Cmd+K), championship scenario calculator, sector time comparison, and overtake probability zones.

## Prerequisites
- Phase 4-6 (Live console, stores, WebSocket data)
- Phase 7 (Historical data for calculations)

## Deliverables
- Pro Mode toggle in header
- `apps/web/components/pro-tools/` — All 8 tools
- Command palette (Cmd+K) with `cmdk` library
- Overlay panel system

---

## Task Breakdown

### 10.1 Pro Mode Overlay System

```bash
cd apps/web
pnpm add cmdk
```

```typescript
// apps/web/components/pro-tools/pro-tools-overlay.tsx
"use client";

import { useUIStore } from "@pitwall/stores";
import { PitWindowCalculator } from "./pit-window-calculator";
import { PaceDeltaChart } from "./pace-delta-chart";
import { TireDegradationChart } from "./tire-degradation-chart";
import { RacePaceTable } from "./race-pace-table";
import { CommandPalette } from "./command-palette";
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
                : "text-text-muted hover:text-text-secondary"
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
```

### 10.2 Pit Window Calculator

```typescript
// apps/web/components/pro-tools/pit-window-calculator.tsx
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
```

### 10.3 Pace Delta Chart

```typescript
// apps/web/components/pro-tools/pace-delta-chart.tsx
"use client";

import { useState } from "react";
import { useStandingsStore } from "@pitwall/stores";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Select 2 drivers, show cumulative time delta per lap
// Positive = Driver A ahead, Negative = Driver B ahead
// Slope = rate of closure (tenths per lap)
// Pit stop markers as reference dots

export function PaceDeltaChart() {
  const standings = useStandingsStore((s) => s.standings);
  const [driverA, setDriverA] = useState(standings[0]?.driverNumber);
  const [driverB, setDriverB] = useState(standings[1]?.driverNumber);

  // In production, fetch cumulative delta data from backend
  // For now, show driver selectors and placeholder chart

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <DriverSelector label="Driver A" value={driverA} onChange={setDriverA} standings={standings} />
        <span className="text-text-muted text-xs">vs</span>
        <DriverSelector label="Driver B" value={driverB} onChange={setDriverB} standings={standings} />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[/* cumulative delta data */]}>
            <XAxis dataKey="lap" stroke="#555" fontSize={10} />
            <YAxis stroke="#555" fontSize={10} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}s`} />
            <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
            <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
            <Line type="monotone" dataKey="delta" stroke="#E10600" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DriverSelector({ label, value, onChange, standings }: any) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-text-muted">{label}:</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="bg-bg-elevated text-xs border border-border-default rounded px-1.5 py-0.5">
        {standings.map((s: any) => (
          <option key={s.driverNumber} value={s.driverNumber}>{s.broadcastName}</option>
        ))}
      </select>
    </div>
  );
}
```

### 10.4 Command Palette (Cmd+K)

```typescript
// apps/web/components/pro-tools/command-palette.tsx
"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="bg-bg-surface border border-border-default rounded-lg shadow-2xl w-[500px]" onClick={(e) => e.stopPropagation()}>
        <Command className="rounded-lg">
          <Command.Input
            placeholder="Search stats, drivers, records..."
            className="w-full px-4 py-3 bg-transparent text-sm border-b border-border-default outline-none"
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-4 text-center text-sm text-text-muted">No results found.</Command.Empty>

            <Command.Group heading="Quick Stats" className="text-[10px] text-text-muted uppercase tracking-wider px-2 py-1">
              <CommandItem label="Last 5 winners at this circuit" icon="🏁" />
              <CommandItem label="Fastest pit stop today" icon="⏱️" />
              <CommandItem label="Most penalties this season" icon="⚖️" />
              <CommandItem label="Championship calculator" icon="🏆" />
            </Command.Group>

            <Command.Group heading="Drivers" className="text-[10px] text-text-muted uppercase tracking-wider px-2 py-1">
              <CommandItem label="VER vs HAM head-to-head" icon="👤" />
              <CommandItem label="NOR qualifying record here" icon="👤" />
            </Command.Group>

            <Command.Group heading="Navigation" className="text-[10px] text-text-muted uppercase tracking-wider px-2 py-1">
              <CommandItem label="Go to standings" icon="📊" />
              <CommandItem label="Go to records" icon="🏅" />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({ label, icon }: { label: string; icon: string }) {
  return (
    <Command.Item className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-bg-elevated data-[selected=true]:bg-bg-elevated">
      <span>{icon}</span>
      <span>{label}</span>
    </Command.Item>
  );
}
```

### 10.5 Other Pro Tools (Simplified)

**Race Pace Table:**
- Grid: Drivers × Stints with average lap times
- Exclude pit in/out, SC laps, first lap
- Highlight fastest stint pace per compound

**Tire Degradation Curves:**
- Per-driver line chart: X = stint lap, Y = lap time
- Separate curves colored by compound
- Steep slopes indicate high degradation

**Championship Scenario Calculator:**
- "What-if" mode: input hypothetical results for remaining races
- Show resulting championship order
- "Can driver X still win?" mathematical check

**Sector Time Comparison:**
- Bar chart: 2+ drivers, best sector times
- Green/Red coloring for advantage/disadvantage per sector

---

## Acceptance Criteria
- [ ] Pro Mode toggle reveals overlay panel between timing tower and bottom bar
- [ ] Pit Window Calculator shows exit position projections for selected driver
- [ ] Pace Delta Chart shows cumulative time delta between 2 drivers
- [ ] Command Palette opens with Cmd+K / Ctrl+K
- [ ] Command palette searches drivers, stats, navigation
- [ ] Race Pace Table shows stint-by-stint averages
- [ ] Tire Degradation shows compound-colored curves
- [ ] Championship Calculator supports what-if scenarios

## Key Dependencies
```
cmdk recharts
@pitwall/stores @pitwall/utils
```

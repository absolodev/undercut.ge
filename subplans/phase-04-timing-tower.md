# Phase 4: Live Console — Timing Tower (Week 3-4)

## Overview
Build the full timing tower component — the left panel of the live console showing all 20 drivers with positions, gaps, sector times, tire info, and penalties. Also create all Zustand stores and the Socket.io client wrapper that powers the entire live console.

## Prerequisites
- Phase 1 (Next.js app, Tailwind/Shadcn UI, shared packages)
- Phase 3 (WebSocket server running, or mock replay server)

## Deliverables
- `packages/socket-client/` — Socket.io client with room management
- `packages/stores/` — All 12 Zustand stores
- `apps/web/components/live/timing-tower.tsx` and sub-components
- Smooth row reordering animation
- Penalty HoverCard with details
- Tire/sector/gap display components
- Column visibility toggles

---

## Task Breakdown

### 4.1 Socket.io Client Package

```bash
cd packages/socket-client
pnpm init
pnpm add socket.io-client
```

```typescript
// packages/socket-client/src/index.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => console.log("[WS] Connected:", socket!.id));
    socket.on("disconnect", (reason) => console.log("[WS] Disconnected:", reason));
    socket.on("reconnect_attempt", (n) => console.log("[WS] Reconnecting:", n));
  }
  return socket;
}

export function subscribeToMap(): void {
  getSocket().emit("subscribe:map");
}

export function unsubscribeFromMap(): void {
  getSocket().emit("unsubscribe:map");
}

export function subscribeToTelemetry(driverNumber: number): void {
  getSocket().emit("subscribe:telemetry", driverNumber);
}

export function unsubscribeFromTelemetry(): void {
  getSocket().emit("unsubscribe:telemetry");
}
```

### 4.2 Zustand Stores

```bash
cd packages/stores
pnpm init
pnpm add zustand
```

```typescript
// packages/stores/src/standings-store.ts
import { create } from "zustand";
import type { LiveStanding } from "@pitwall/types";

interface StandingsState {
  standings: LiveStanding[];
  previousPositions: Map<number, number>; // driverNumber → previous position
  setStandings: (standings: LiveStanding[]) => void;
}

export const useStandingsStore = create<StandingsState>((set, get) => ({
  standings: [],
  previousPositions: new Map(),

  setStandings: (newStandings) => {
    const prev = get().standings;
    const prevMap = new Map<number, number>();
    for (const s of prev) {
      prevMap.set(s.driverNumber, s.position);
    }
    set({ standings: newStandings, previousPositions: prevMap });
  },
}));
```

```typescript
// packages/stores/src/positions-store.ts
import { create } from "zustand";
import type { CarPosition } from "@pitwall/types";

interface PositionsState {
  positions: CarPosition[];
  previousPositions: CarPosition[];  // For interpolation
  lastUpdateTime: number;
  setPositions: (positions: CarPosition[]) => void;
}

export const usePositionsStore = create<PositionsState>((set, get) => ({
  positions: [],
  previousPositions: [],
  lastUpdateTime: Date.now(),

  setPositions: (newPositions) => {
    set({
      previousPositions: get().positions,
      positions: newPositions,
      lastUpdateTime: Date.now(),
    });
  },
}));
```

```typescript
// packages/stores/src/session-store.ts
import { create } from "zustand";
import type { SessionType, TrackStatus } from "@pitwall/types";

interface SessionState {
  sessionType: SessionType | null;
  sessionName: string;
  meetingName: string;
  circuitName: string;
  currentLap: number;
  totalLaps: number;
  trackStatus: TrackStatus;
  drsEnabled: boolean;
  setSession: (data: Partial<SessionState>) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionType: null,
  sessionName: "",
  meetingName: "",
  circuitName: "",
  currentLap: 0,
  totalLaps: 0,
  trackStatus: "GREEN",
  drsEnabled: false,
  setSession: (data) => set(data),
}));
```

```typescript
// packages/stores/src/weather-store.ts
import { create } from "zustand";
import type { WeatherData } from "@pitwall/types";

interface WeatherState {
  weather: WeatherData | null;
  setWeather: (data: WeatherData) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: null,
  setWeather: (data) => set({ weather: data }),
}));
```

```typescript
// packages/stores/src/race-control-store.ts
import { create } from "zustand";
import type { RaceControlMessage } from "@pitwall/types";

interface RaceControlState {
  messages: RaceControlMessage[];
  addMessage: (msg: RaceControlMessage) => void;
}

export const useRaceControlStore = create<RaceControlState>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => ({
      messages: [msg, ...state.messages].slice(0, 100), // Keep last 100
    })),
}));
```

```typescript
// packages/stores/src/ui-store.ts
import { create } from "zustand";

interface UIState {
  selectedDriver: number | null;
  isFullscreen: boolean;
  isProMode: boolean;
  visibleColumns: Set<string>;
  setSelectedDriver: (num: number | null) => void;
  toggleFullscreen: () => void;
  toggleProMode: () => void;
  toggleColumn: (col: string) => void;
}

const DEFAULT_COLUMNS = new Set([
  "position", "team", "driver", "gap", "interval",
  "lastLap", "s1", "s2", "s3", "tire", "age", "pit", "penalty"
]);

export const useUIStore = create<UIState>((set) => ({
  selectedDriver: null,
  isFullscreen: false,
  isProMode: false,
  visibleColumns: DEFAULT_COLUMNS,
  setSelectedDriver: (num) => set({ selectedDriver: num }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  toggleProMode: () => set((s) => ({ isProMode: !s.isProMode })),
  toggleColumn: (col) => set((s) => {
    const cols = new Set(s.visibleColumns);
    cols.has(col) ? cols.delete(col) : cols.add(col);
    return { visibleColumns: cols };
  }),
}));
```

```typescript
// packages/stores/src/index.ts — Re-export all stores
export { useStandingsStore } from "./standings-store";
export { usePositionsStore } from "./positions-store";
export { useSessionStore } from "./session-store";
export { useWeatherStore } from "./weather-store";
export { useRaceControlStore } from "./race-control-store";
export { useTeamRadioStore } from "./team-radio-store";
export { useTrackStatusStore } from "./track-status-store";
export { useTelemetryStore } from "./telemetry-store";
export { usePenaltyStore } from "./penalty-store";
export { useDnfStore } from "./dnf-store";
export { useSpeedTrapStore } from "./speed-trap-store";
export { useUIStore } from "./ui-store";
```

### 4.3 WebSocket → Store Connector

```typescript
// apps/web/lib/ws-connector.ts
"use client";

import { useEffect } from "react";
import { getSocket } from "@pitwall/socket-client";
import {
  useStandingsStore,
  usePositionsStore,
  useWeatherStore,
  useRaceControlStore,
  useTeamRadioStore,
  useSessionStore,
} from "@pitwall/stores";

export function useWebSocketConnection() {
  useEffect(() => {
    const socket = getSocket();

    socket.on("standings", (data) => {
      useStandingsStore.getState().setStandings(data.standings);
      if (data.lap) useSessionStore.getState().setSession({ currentLap: data.lap.current, totalLaps: data.lap.total });
      if (data.weather) useWeatherStore.getState().setWeather(data.weather);
    });

    socket.on("positions", (data) => {
      usePositionsStore.getState().setPositions(data);
    });

    socket.on("race_control", (msg) => {
      useRaceControlStore.getState().addMessage(msg);
    });

    socket.on("team_radio", (msg) => {
      useTeamRadioStore.getState().addMessage(msg);
    });

    socket.on("track_status", (status) => {
      useSessionStore.getState().setSession({ trackStatus: status.status });
    });

    return () => {
      socket.off("standings");
      socket.off("positions");
      socket.off("race_control");
      socket.off("team_radio");
      socket.off("track_status");
    };
  }, []);
}
```

### 4.4 Timing Tower Component

```typescript
// apps/web/components/live/timing-tower.tsx
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
```

### 4.5 Timing Row Component

```typescript
// apps/web/components/live/timing-row.tsx
"use client";

import { cn } from "@/lib/utils";
import { formatLapTime, formatGap } from "@pitwall/utils";
import { SECTOR_COLORS, TIRE_COLORS } from "@pitwall/constants";
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
```

### 4.6 Sub-components

```typescript
// apps/web/components/live/sector-time.tsx
import { cn } from "@/lib/utils";
import { formatLapTime } from "@pitwall/utils";

interface SectorTimeProps {
  value: number | null;
  isOverallBest?: boolean;
  isPersonalBest?: boolean;
  width: string;
}

export function SectorTime({ value, isOverallBest, isPersonalBest, width }: SectorTimeProps) {
  const color = isOverallBest
    ? "text-sector-purple"
    : isPersonalBest
    ? "text-sector-green"
    : "text-sector-yellow";

  return (
    <div className={cn(width, "text-right font-mono text-[10px] tabular-nums", value ? color : "text-text-muted")}>
      {value ? (value / 1000).toFixed(3) : "—"}
    </div>
  );
}
```

```typescript
// apps/web/components/live/tire-compound-icon.tsx
import { TIRE_COLORS } from "@pitwall/constants";
import type { TireCompound } from "@pitwall/types";

interface TireCompoundIconProps {
  compound: TireCompound;
  size?: number;
}

export function TireCompoundIcon({ compound, size = 16 }: TireCompoundIconProps) {
  const color = TIRE_COLORS[compound] || "#888";
  const label = compound.charAt(0); // S, M, H, I, W

  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      {/* Outer ring — compound color */}
      <circle cx="8" cy="8" r="7" fill="none" stroke={color} strokeWidth="2.5" />
      {/* Inner fill */}
      <circle cx="8" cy="8" r="4.5" fill="#333" />
      {/* Letter */}
      <text x="8" y="11" textAnchor="middle" fill={color} fontSize="7" fontWeight="bold" fontFamily="monospace">
        {label}
      </text>
    </svg>
  );
}
```

```typescript
// apps/web/components/live/penalty-badge.tsx
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { PENALTY_LABELS } from "@pitwall/constants";
import type { Penalty } from "@pitwall/types";

interface PenaltyBadgeProps {
  penalties: Penalty[];
  driverName: string;
}

export function PenaltyBadge({ penalties, driverName }: PenaltyBadgeProps) {
  const latest = penalties[penalties.length - 1];
  const info = PENALTY_LABELS[latest.type];

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <button className="text-[10px] text-f1-red hover:text-white transition-colors">
          {info?.icon || "⚠️"}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-bg-surface border-border-default" side="left">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{info?.icon}</span>
            <span className="font-bold text-f1-red text-sm">{info?.label}</span>
          </div>
          <div className="text-xs text-text-secondary">
            <p><span className="text-text-muted">Driver:</span> {driverName}</p>
            <p><span className="text-text-muted">Lap:</span> {latest.lap}</p>
            <p className="mt-1"><span className="text-text-muted">Reason:</span> {latest.reason}</p>
            {latest.regulationRef && (
              <p><span className="text-text-muted">Regulation:</span> {latest.regulationRef}</p>
            )}
          </div>
          <div className="pt-1 border-t border-border-default">
            <p className="text-[10px] text-text-muted">
              Status: {latest.isServed ? "✅ Served" : "⏳ Not Yet Served"}
            </p>
          </div>
          <div className="pt-1 border-t border-border-default">
            <p className="text-[10px] text-text-muted italic">
              📖 {info?.description}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
```

### 4.7 Column Visibility Controls

```typescript
// apps/web/components/live/timing-tower-controls.tsx
import { useUIStore } from "@pitwall/stores";

const COLUMNS = [
  { key: "gap", label: "GAP" },
  { key: "interval", label: "INT" },
  { key: "lastLap", label: "LAST" },
  { key: "s1", label: "S1" },
  { key: "s2", label: "S2" },
  { key: "s3", label: "S3" },
  { key: "tire", label: "TYR" },
  { key: "age", label: "AGE" },
  { key: "pit", label: "PT" },
  { key: "penalty", label: "PEN" },
];

export function TimingTowerControls() {
  const { visibleColumns, toggleColumn } = useUIStore();

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-t border-border-default shrink-0">
      <span className="text-[9px] text-text-muted mr-1">COLS:</span>
      {COLUMNS.map((col) => (
        <button
          key={col.key}
          onClick={() => toggleColumn(col.key)}
          className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
            visibleColumns.has(col.key)
              ? "bg-bg-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {col.label}
        </button>
      ))}
    </div>
  );
}
```

---

## Acceptance Criteria
- [ ] Timing tower shows 20 rows with all 13 columns
- [ ] Row positions reorder smoothly (300ms spring animation) on position changes
- [ ] Sector times colored: purple (overall best), green (personal best), yellow (slower)
- [ ] Tire compound icons show correct colors (red/yellow/white/green/blue)
- [ ] Penalty badge shows HoverCard on hover with full details
- [ ] "PIT" text replaces gap when car is in pit lane
- [ ] Purple left border on driver with fastest lap
- [ ] Retired drivers grayed out at bottom
- [ ] DRS text badge appears when interval < 1s
- [ ] Column visibility toggles hide/show columns
- [ ] All stores update correctly from WebSocket data
- [ ] Position delta arrows (▲/▼) show on overtakes

## Key Dependencies
```
socket.io-client zustand framer-motion
@radix-ui/react-hover-card (via Shadcn)
@pitwall/types @pitwall/constants @pitwall/utils
```

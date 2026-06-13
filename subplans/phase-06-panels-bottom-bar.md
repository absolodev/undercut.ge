# Phase 6: Live Console — Right Panel + Bottom Bar (Week 5-6)

## Overview
Complete the live console by building the Race Control feed, Team Radio feed, Session Header bar, and all Bottom Bar widgets (DNF ticker, speed trap, tire strategy, weather, pace sparkline).

## Prerequisites
- Phase 4 (Stores, Socket.io client)
- Phase 5 (Track map renders)

## Deliverables
- Race Control Feed with color-coded messages and filtering
- Team Radio Feed with Howler.js audio playback
- Session Header (40px status bar with all live indicators)
- Bottom Bar widgets (5 sub-components)

---

## Task Breakdown

### 6.1 Race Control Feed

```typescript
// apps/web/components/live/race-control-feed.tsx
"use client";

import { useRaceControlStore } from "@pitwall/stores";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, { bg: string; icon: string }> = {
  Flag: { bg: "bg-flag-yellow/10", icon: "🟡" },
  "Flag:GREEN": { bg: "bg-flag-green/10", icon: "🟢" },
  "Flag:RED": { bg: "bg-flag-red/15", icon: "🔴" },
  "Flag:BLUE": { bg: "bg-flag-blue/10", icon: "🔵" },
  SafetyCar: { bg: "bg-flag-sc/10", icon: "🚨" },
  Penalty: { bg: "bg-flag-red/12", icon: "⚖️" },
  Investigation: { bg: "bg-sector-yellow/8", icon: "🔍" },
  TrackLimits: { bg: "bg-text-muted/8", icon: "⚫" },
  Drs: { bg: "bg-flag-green/8", icon: "📡" },
  Other: { bg: "bg-bg-surface", icon: "📋" },
};

export function RaceControlFeed() {
  const messages = useRaceControlStore((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>("all");

  // Auto-scroll to top (newest messages first)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  const filtered = filter === "all"
    ? messages
    : messages.filter((m) => m.category === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Header with filter */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-default shrink-0">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Race Control</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-bg-elevated text-[10px] border border-border-default rounded px-1 py-0.5"
        >
          <option value="all">All</option>
          <option value="Flag">Flags</option>
          <option value="Penalty">Penalties</option>
          <option value="Investigation">Investigations</option>
          <option value="SafetyCar">Safety Car</option>
          <option value="TrackLimits">Track Limits</option>
        </select>
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.map((msg) => {
          const styleKey = msg.flag ? `Flag:${msg.flag}` : msg.category;
          const style = CATEGORY_STYLES[styleKey] || CATEGORY_STYLES[msg.category] || CATEGORY_STYLES.Other;

          return (
            <div
              key={msg.id}
              className={cn("px-2 py-2 border-b border-border-default text-xs", style.bg)}
            >
              <div className="flex items-center gap-1 text-text-muted mb-0.5">
                <span className="font-mono">LAP {msg.lap}</span>
                <span>•</span>
                <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span>{style.icon}</span>
                <span className="text-text-primary leading-tight">{msg.message}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-text-muted text-xs py-8">No messages yet</div>
        )}
      </div>
    </div>
  );
}
```

### 6.2 Team Radio Feed

```bash
cd apps/web
pnpm add howler
pnpm add -D @types/howler
```

```typescript
// apps/web/components/live/team-radio-feed.tsx
"use client";

import { useTeamRadioStore, useStandingsStore } from "@pitwall/stores";
import { useState, useRef } from "react";
import { Howl } from "howler";

export function TeamRadioFeed() {
  const messages = useTeamRadioStore((s) => s.messages);
  const standings = useStandingsStore((s) => s.standings);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const howlRef = useRef<Howl | null>(null);

  const teams = [...new Set(standings.map((s) => s.broadcastName.slice(0, 3)))];

  const filtered = teamFilter === "all"
    ? messages
    : messages.filter((m) => m.broadcastName === teamFilter);

  function playAudio(url: string, messageId: string) {
    // Stop any current playback
    if (howlRef.current) {
      howlRef.current.stop();
    }

    howlRef.current = new Howl({
      src: [url],
      format: ["mp3"],
      onplay: () => setPlayingId(messageId),
      onend: () => setPlayingId(null),
      onerror: () => setPlayingId(null),
    });
    howlRef.current.play();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-default shrink-0">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Team Radio</span>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-bg-elevated text-[10px] border border-border-default rounded px-1 py-0.5"
        >
          <option value="all">All Teams</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Radio messages */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((msg) => (
          <div key={msg.id} className="px-2 py-2 border-b border-border-default">
            <div className="flex items-center gap-1 text-[10px] text-text-muted mb-1">
              <span className="font-mono">LAP {msg.lap}</span>
              <span>•</span>
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-start gap-2">
              {/* Driver avatar circle */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                style={{ backgroundColor: msg.teamColor + "33", borderColor: msg.teamColor, borderWidth: 1 }}
              >
                🎧
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold" style={{ color: msg.teamColor }}>{msg.broadcastName}</span>
                {msg.recordingUrl && (
                  <button
                    onClick={() => playAudio(msg.recordingUrl!, msg.id)}
                    className={cn(
                      "ml-2 px-2 py-0.5 rounded text-[10px] transition-colors",
                      playingId === msg.id
                        ? "bg-f1-red text-white"
                        : "bg-bg-elevated text-text-secondary hover:text-white"
                    )}
                  >
                    {playingId === msg.id ? "⏸ Playing..." : "▶ Play"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6.3 Right Panel Container (Tabs)

```typescript
// apps/web/components/live/right-panel.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RaceControlFeed } from "./race-control-feed";
import { TeamRadioFeed } from "./team-radio-feed";
import { useRaceControlStore, useTeamRadioStore } from "@pitwall/stores";

export function RightPanel() {
  const rcmCount = useRaceControlStore((s) => s.messages.length);
  const radioCount = useTeamRadioStore((s) => s.messages.length);

  return (
    <Tabs defaultValue="race-control" className="h-full flex flex-col">
      <TabsList className="bg-bg-surface border-b border-border-default rounded-none h-8 shrink-0">
        <TabsTrigger value="race-control" className="text-[10px] data-[state=active]:bg-bg-elevated">
          RACE CTRL ({rcmCount})
        </TabsTrigger>
        <TabsTrigger value="team-radio" className="text-[10px] data-[state=active]:bg-bg-elevated">
          RADIO ({radioCount})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="race-control" className="flex-1 overflow-hidden m-0">
        <RaceControlFeed />
      </TabsContent>
      <TabsContent value="team-radio" className="flex-1 overflow-hidden m-0">
        <TeamRadioFeed />
      </TabsContent>
    </Tabs>
  );
}
```

### 6.4 Session Header (40px Status Bar)

```typescript
// components/shell/session-header.tsx
"use client";

import { useSessionStore, useWeatherStore } from "@pitwall/stores";
import { FLAG_COLORS } from "@pitwall/constants";
import { useEffect, useState } from "react";

export function SessionHeader() {
  const { trackStatus, sessionType, currentLap, totalLaps, drsEnabled, circuitName } = useSessionStore();
  const weather = useWeatherStore((s) => s.weather);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusColor = FLAG_COLORS[trackStatus] || "#00FF00";

  return (
    <div className="h-10 bg-bg-primary border-b border-border-default flex items-center px-4 gap-4 shrink-0 font-mono text-xs">
      {/* Logo + Sport */}
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-bold tracking-wider text-f1-red">PITWALL</span>
        <span className="text-text-muted">F1</span>
      </div>

      <div className="w-px h-5 bg-border-default" />

      {/* Track status */}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
        <span className="uppercase font-semibold" style={{ color: statusColor }}>{trackStatus}</span>
      </div>

      {/* Session badge */}
      {sessionType && (
        <span className="bg-f1-red text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{sessionType}</span>
      )}

      {/* Lap counter */}
      {totalLaps > 0 && (
        <span className="tabular-nums">LAP <span className="font-bold">{currentLap}</span>/{totalLaps}</span>
      )}

      <div className="flex-1" />

      {/* Weather */}
      {weather && (
        <div className="flex items-center gap-3 text-text-secondary">
          <span>🌡️ {weather.airTemperature}°C</span>
          <span>🛤️ {weather.trackTemperature}°C</span>
          <span>💧 {weather.humidity}%</span>
          <span>💨 {weather.windSpeed} km/h</span>
          {weather.rainfall && <span className="text-flag-blue font-bold">🌧️ RAIN</span>}
        </div>
      )}

      {/* DRS */}
      <span className={drsEnabled ? "text-flag-green" : "text-text-muted"}>
        DRS {drsEnabled ? "ON" : "OFF"}
      </span>

      <div className="w-px h-5 bg-border-default" />

      {/* Clock */}
      <span className="text-text-muted tabular-nums">{clock}</span>
    </div>
  );
}
```

### 6.5 Bottom Bar Widgets

```typescript
// apps/web/components/live/bottom-bar/index.tsx
export function BottomBar() {
  return (
    <div className="h-full flex items-center gap-4 px-4 overflow-x-auto">
      <DnfTicker />
      <Divider />
      <SpeedTrapWidget />
      <Divider />
      <TireStrategyMini />
      <Divider />
      <WeatherWidget />
      <Divider />
      <PaceSparkline />
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-border-default shrink-0" />;
}
```

```typescript
// apps/web/components/live/bottom-bar/dnf-ticker.tsx
import { useDnfStore } from "@pitwall/stores";

export function DnfTicker() {
  const dnfs = useDnfStore((s) => s.dnfs);
  if (dnfs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-[10px] shrink-0">
      <span className="text-text-muted uppercase">DNF:</span>
      <div className="flex gap-3">
        {dnfs.map((d) => (
          <span key={d.driverNumber} className="text-text-secondary">
            💥 L{d.lap}: <span className="font-semibold text-white">{d.broadcastName}</span> — {d.reason}
          </span>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// apps/web/components/live/bottom-bar/speed-trap-widget.tsx
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
      </div>
    </div>
  );
}
```

```typescript
// apps/web/components/live/bottom-bar/pace-sparkline.tsx
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
```

---

## Acceptance Criteria
- [ ] Race Control feed shows messages with correct color-coding per category
- [ ] Messages auto-scroll to newest
- [ ] Category filter works (Flags, Penalties, etc.)
- [ ] Team Radio feed shows messages with audio play button
- [ ] Howler.js plays audio clips; only one plays at a time
- [ ] Team filter dropdown works in radio feed
- [ ] Session Header shows: track status indicator, session type badge, lap counter, weather, DRS status, clock
- [ ] Track status dot color matches flag color and pulses
- [ ] Bottom bar displays all 5 widgets
- [ ] DNF ticker shows retired drivers with reason
- [ ] Speed trap shows top 3 speeds
- [ ] All components update in real-time from WebSocket data

## Key Dependencies
```
howler @types/howler
@radix-ui/react-tabs (via Shadcn)
@pitwall/stores @pitwall/constants
```

# Phase 11: Telemetry Comparison Engine (Week 11-12)

## Overview
Build the telemetry comparison tool allowing users to overlay speed, throttle, brake, and gear traces for 2 drivers on the same lap. Includes a "ghost car" replay showing two dots on the track simultaneously, and corner-by-corner analysis.

## Prerequisites
- Phase 5 (Track map / PixiJS)
- Phase 7 (Historical data, Prisma queries)
- FastF1 enrichment data available for detailed telemetry

## Deliverables
- Telemetry comparison page (`/f1/compare`, `/f1/compare/[sessionId]`)
- Driver/session/lap selector UI
- Speed trace overlay chart (2 drivers)
- Throttle, brake, gear trace overlays
- Synchronized chart zooming and panning
- Ghost car replay on track map
- Corner-by-corner analysis table

---

## Task Breakdown

### 11.1 Data Access

```typescript
// apps/web/lib/data/telemetry.ts
import { prisma } from "@pitwall/db";

export async function getTelemetryForLap(sessionId: number, driverId: number, lapNumber: number) {
  return prisma.f1_telemetry.findMany({
    where: { session_id: sessionId, driver_id: driverId, lap_number: lapNumber },
    orderBy: { distance_m: "asc" },
  });
}

export async function getAvailableSessions() {
  // Sessions with telemetry data available
  return prisma.f1_sessions.findMany({
    where: {
      f1_telemetry: { some: {} }, // Has telemetry data
    },
    include: { race: { include: { circuit: true } } },
    orderBy: { date_start: "desc" },
    take: 50,
  });
}
```

### 11.2 Comparison Page

```typescript
// apps/web/app/(shell)/f1/compare/page.tsx
"use client";

import { useState } from "react";
import { SpeedTrace } from "@/components/telemetry/speed-trace";
import { ThrottleBrakeTrace } from "@/components/telemetry/throttle-brake-trace";
import { GearTrace } from "@/components/telemetry/gear-trace";
import { GhostCarReplay } from "@/components/telemetry/ghost-car-replay";
import { CornerAnalysis } from "@/components/telemetry/corner-analysis";
import { TelemetrySelector } from "@/components/telemetry/telemetry-selector";

export default function ComparePage() {
  const [session, setSession] = useState<number | null>(null);
  const [driverA, setDriverA] = useState<{ id: number; lap: number } | null>(null);
  const [driverB, setDriverB] = useState<{ id: number; lap: number } | null>(null);
  const [xAxis, setXAxis] = useState<"distance" | "time">("distance");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold">Telemetry Comparison</h1>

      {/* Selectors */}
      <TelemetrySelector
        onSessionChange={setSession}
        onDriverAChange={setDriverA}
        onDriverBChange={setDriverB}
      />

      {/* X-axis toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setXAxis("distance")}
          className={`px-3 py-1 text-xs rounded ${xAxis === "distance" ? "bg-f1-red text-white" : "bg-bg-surface text-text-muted"}`}
        >
          Distance
        </button>
        <button
          onClick={() => setXAxis("time")}
          className={`px-3 py-1 text-xs rounded ${xAxis === "time" ? "bg-f1-red text-white" : "bg-bg-surface text-text-muted"}`}
        >
          Time
        </button>
      </div>

      {session && driverA && driverB && (
        <>
          {/* Speed trace */}
          <SpeedTrace sessionId={session} driverA={driverA} driverB={driverB} xAxis={xAxis} />

          {/* Throttle + Brake */}
          <ThrottleBrakeTrace sessionId={session} driverA={driverA} driverB={driverB} xAxis={xAxis} />

          {/* Gear */}
          <GearTrace sessionId={session} driverA={driverA} driverB={driverB} xAxis={xAxis} />

          {/* Ghost car replay */}
          <GhostCarReplay sessionId={session} driverA={driverA} driverB={driverB} />

          {/* Corner analysis table */}
          <CornerAnalysis sessionId={session} driverA={driverA} driverB={driverB} />
        </>
      )}
    </div>
  );
}
```

### 11.3 Speed Trace Chart

```typescript
// apps/web/components/telemetry/speed-trace.tsx
"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Brush } from "recharts";

interface TraceProps {
  sessionId: number;
  driverA: { id: number; lap: number };
  driverB: { id: number; lap: number };
  xAxis: "distance" | "time";
}

export function SpeedTrace({ sessionId, driverA, driverB, xAxis }: TraceProps) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/telemetry/compare?session=${sessionId}&driverA=${driverA.id}&lapA=${driverA.lap}&driverB=${driverB.id}&lapB=${driverB.lap}`);
      const json = await res.json();
      setData(json.merged); // Merged by distance_m with speedA, speedB columns
    }
    load();
  }, [sessionId, driverA, driverB]);

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <h3 className="font-display text-sm font-bold mb-3">Speed Trace</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis
            dataKey={xAxis === "distance" ? "distance_m" : "time_ms"}
            stroke="#555"
            fontSize={10}
            tickFormatter={(v) => xAxis === "distance" ? `${(v / 1000).toFixed(1)}km` : `${(v / 1000).toFixed(1)}s`}
          />
          <YAxis stroke="#555" fontSize={10} domain={[0, 370]} unit=" km/h" />
          <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />

          {/* Driver A speed */}
          <Line type="monotone" dataKey="speedA" stroke="#E10600" strokeWidth={1.5} dot={false} name="Driver A" />
          {/* Driver B speed */}
          <Line type="monotone" dataKey="speedB" stroke="#3671C6" strokeWidth={1.5} dot={false} name="Driver B" />

          {/* Zoom/pan brush */}
          <Brush dataKey="distance_m" height={20} stroke="#555" />
        </LineChart>
      </ResponsiveContainer>

      {/* Delta overlay: shade regions where A is faster vs B */}
    </div>
  );
}
```

### 11.4 Ghost Car Replay

```typescript
// apps/web/components/telemetry/ghost-car-replay.tsx
"use client";

import { useEffect, useRef, useState } from "react";

// Replay two cars on the track map simultaneously
// Uses stored telemetry X/Y positions indexed by distance or time
// Playback controls: Play, Pause, Speed (0.5x, 1x, 2x, 5x)
// Progress bar showing current position in lap

export function GhostCarReplay({ sessionId, driverA, driverB }: any) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Load telemetry positions for both drivers
  // On each animation frame, advance progress based on speed
  // Render both dots on a static track map

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <h3 className="font-display text-sm font-bold mb-3">Ghost Car Replay</h3>
      <canvas ref={canvasRef} className="w-full h-[300px] bg-black rounded" />

      {/* Playback controls */}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-3 py-1 text-xs bg-f1-red text-white rounded"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        {[0.5, 1, 2, 5].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 text-[10px] rounded ${speed === s ? "bg-bg-elevated text-white" : "text-text-muted"}`}
          >
            {s}x
          </button>
        ))}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
```

### 11.5 Corner-by-Corner Analysis

```typescript
// apps/web/components/telemetry/corner-analysis.tsx
// Table: Corner Number | Name | Driver A Time | Driver B Time | Delta
// Green = faster, Red = slower
// Show where time is gained/lost per corner
// Calculated from telemetry by measuring time between corner entry/exit points
```

### 11.6 API Route for Telemetry Data

```typescript
// apps/web/app/api/telemetry/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@pitwall/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = Number(searchParams.get("session"));
  const driverAId = Number(searchParams.get("driverA"));
  const lapA = Number(searchParams.get("lapA"));
  const driverBId = Number(searchParams.get("driverB"));
  const lapB = Number(searchParams.get("lapB"));

  const [telA, telB] = await Promise.all([
    prisma.f1_telemetry.findMany({
      where: { session_id: sessionId, driver_id: driverAId, lap_number: lapA },
      orderBy: { distance_m: "asc" },
    }),
    prisma.f1_telemetry.findMany({
      where: { session_id: sessionId, driver_id: driverBId, lap_number: lapB },
      orderBy: { distance_m: "asc" },
    }),
  ]);

  // Merge by distance (interpolate to common distance points)
  const merged = mergeByDistance(telA, telB);

  return NextResponse.json({ merged });
}

function mergeByDistance(telA: any[], telB: any[]) {
  // Create distance-aligned data points for chart overlay
  // Use linear interpolation to align both datasets to common distance intervals (every 10m)
  const step = 10; // meters
  const maxDist = Math.max(
    telA[telA.length - 1]?.distance_m || 0,
    telB[telB.length - 1]?.distance_m || 0
  );

  const result = [];
  let iA = 0, iB = 0;

  for (let d = 0; d <= maxDist; d += step) {
    while (iA < telA.length - 1 && telA[iA + 1].distance_m <= d) iA++;
    while (iB < telB.length - 1 && telB[iB + 1].distance_m <= d) iB++;

    result.push({
      distance_m: d,
      speedA: telA[iA]?.speed || 0,
      speedB: telB[iB]?.speed || 0,
      throttleA: telA[iA]?.throttle || 0,
      throttleB: telB[iB]?.throttle || 0,
      brakeA: telA[iA]?.brake || false,
      brakeB: telB[iB]?.brake || false,
      gearA: telA[iA]?.gear || 0,
      gearB: telB[iB]?.gear || 0,
    });
  }
  return result;
}
```

---

## Acceptance Criteria
- [ ] Session/driver/lap selectors work and load telemetry data
- [ ] Speed trace shows 2 overlaid lines (different colors per driver)
- [ ] Throttle/brake trace shows both drivers
- [ ] Gear trace shows both drivers
- [ ] Charts support zoom via Brush component
- [ ] Distance/Time X-axis toggle works
- [ ] Ghost car replay shows 2 dots on track map with playback controls
- [ ] Corner analysis table shows time gained/lost per corner
- [ ] Data merging aligns both datasets by distance correctly

## Key Dependencies
```
recharts (already installed)
@pitwall/db (telemetry queries)
```

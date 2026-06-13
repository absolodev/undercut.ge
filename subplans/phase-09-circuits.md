# Phase 9: Circuit Encyclopedia (Week 9-10)

## Overview
Build circuit profile pages with interactive track maps, corner guides, elevation profiles, DRS zone visualization, race history, overtaking stats, and the circuit comparison tool.

## Prerequisites
- Phase 7 (historical data, Recharts)
- Circuit SVG coordinate data seeded (from Phase 2)

## Deliverables
- All Circuits page (`/f1/circuits`)
- Circuit Profile page (`/f1/circuits/[id]`) with all sections from master plan
- Circuit Comparison tool
- SVG track map renderer for static pages

---

## Task Breakdown

### 9.1 Circuit Data Queries

```typescript
// apps/web/lib/data/circuits.ts
import { prisma } from "@pitwall/db";

export async function getCircuitProfile(circuitRef: string) {
  const circuit = await prisma.f1_circuits.findUnique({
    where: { circuit_ref: circuitRef },
  });
  if (!circuit) return null;

  // Race history at this circuit
  const raceHistory = await prisma.f1_races.findMany({
    where: { circuit_id: circuit.id },
    orderBy: { season_year: "desc" },
    include: {
      sessions: {
        where: { session_type: "R" },
        include: {
          results: {
            where: { finish_position: 1 },
            include: { driver: true, constructor: true },
          },
        },
      },
    },
  });

  // Circuit records (fastest qualifying, fastest race lap)
  const fastestQualifying = await prisma.$queryRaw`
    SELECT d.full_name, r.season_year, MIN(LEAST(qr.q1_time_ms, qr.q2_time_ms, qr.q3_time_ms)) as time_ms
    FROM f1_qualifying_results qr
    JOIN f1_sessions s ON qr.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_drivers d ON qr.driver_id = d.id
    WHERE r.circuit_id = ${circuit.id}
    GROUP BY d.full_name, r.season_year
    ORDER BY time_ms ASC LIMIT 1
  `;

  // Most wins at this circuit
  const mostWins = await prisma.$queryRaw`
    SELECT d.full_name, d.broadcast_name, COUNT(*) as wins
    FROM f1_results res
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_drivers d ON res.driver_id = d.id
    WHERE r.circuit_id = ${circuit.id} AND res.finish_position = 1 AND s.session_type = 'R'
    GROUP BY d.id, d.full_name, d.broadcast_name
    ORDER BY wins DESC LIMIT 5
  `;

  // Pole position time evolution by year
  const poleEvolution = await prisma.$queryRaw`
    SELECT r.season_year as year,
      MIN(LEAST(qr.q1_time_ms, qr.q2_time_ms, qr.q3_time_ms)) as pole_time_ms
    FROM f1_qualifying_results qr
    JOIN f1_sessions s ON qr.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    WHERE r.circuit_id = ${circuit.id} AND qr.position = 1
    GROUP BY r.season_year
    ORDER BY r.season_year ASC
  `;

  return { circuit, raceHistory, fastestQualifying, mostWins, poleEvolution };
}
```

### 9.2 Circuit Profile Page

```typescript
// apps/web/app/(shell)/f1/circuits/[id]/page.tsx
import { getCircuitProfile } from "@/lib/data/circuits";
import { CircuitHeader } from "@/components/circuits/circuit-header";
import { StaticTrackMap } from "@/components/circuits/static-track-map";
import { CornerGuide } from "@/components/circuits/corner-guide";
import { ElevationProfile } from "@/components/circuits/elevation-profile";
import { DrsZoneVisualization } from "@/components/circuits/drs-zones";
import { RaceHistoryTable } from "@/components/circuits/race-history-table";
import { CircuitRecords } from "@/components/circuits/circuit-records";
import { LapTimeEvolution } from "@/components/circuits/lap-time-evolution";

export default async function CircuitProfilePage({ params }: { params: { id: string } }) {
  const data = await getCircuitProfile(params.id);
  if (!data) return <div>Circuit not found</div>;
  const { circuit } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header: Name, location, country flag, key stats */}
      <CircuitHeader circuit={circuit} />

      {/* Track map + corner guide side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-surface border border-border-default rounded-lg p-4">
          <h2 className="font-display text-sm font-bold mb-3">Track Layout</h2>
          <StaticTrackMap
            svgPath={circuit.map_svg_path}
            corners={circuit.corner_data}
            drsZones={circuit.drs_zones}
          />
        </div>
        <div className="bg-bg-surface border border-border-default rounded-lg p-4">
          <h2 className="font-display text-sm font-bold mb-3">Corner Guide</h2>
          <CornerGuide corners={circuit.corner_data} />
        </div>
      </div>

      {/* Key stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Length" value={`${(circuit.length_meters! / 1000).toFixed(3)} km`} />
        <StatCard label="Turns" value={circuit.turns || "—"} />
        <StatCard label="Pit Loss" value={`~${circuit.pit_loss_time}s`} />
        <StatCard label="DRS Zones" value={circuit.drs_zones?.length || 0} />
        <StatCard label="First GP" value={data.raceHistory[data.raceHistory.length - 1]?.season_year || "—"} />
      </div>

      {/* DRS Zone Visualization */}
      <DrsZoneVisualization drsZones={circuit.drs_zones} svgPath={circuit.map_svg_path} />

      {/* Elevation Profile */}
      {circuit.elevation_data && (
        <ElevationProfile data={circuit.elevation_data} />
      )}

      {/* Lap Time Evolution */}
      <LapTimeEvolution data={data.poleEvolution} />

      {/* Circuit Records */}
      <CircuitRecords
        fastestQualifying={data.fastestQualifying}
        mostWins={data.mostWins}
      />

      {/* Race History Table */}
      <RaceHistoryTable races={data.raceHistory} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-3">
      <div className="text-[10px] text-text-muted uppercase">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}
```

### 9.3 Static Track Map (SVG)

```typescript
// apps/web/components/circuits/static-track-map.tsx
"use client";

// For static pages (not live console), use SVG instead of PixiJS
// Render circuit outline as SVG <path>, annotate corners, DRS zones, sectors
// Interactive: hover corners to highlight, click for details

export function StaticTrackMap({ svgPath, corners, drsZones }: {
  svgPath: string | null;
  corners: any;
  drsZones: any;
}) {
  if (!svgPath) return <div className="text-text-muted text-center py-8">Track map data not available</div>;

  return (
    <svg viewBox="0 0 1000 600" className="w-full h-auto">
      {/* Track outline */}
      <path d={svgPath} fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />

      {/* DRS zones */}
      {drsZones?.map((zone: any, i: number) => (
        <path key={i} d={zone.activationPathSegment} fill="none" stroke="#00ff00" strokeWidth="3" strokeDasharray="8 4" opacity="0.6" />
      ))}

      {/* Corner labels */}
      {corners?.map((c: any) => (
        <g key={c.number}>
          <circle cx={c.position.x} cy={c.position.y} r="8" fill="#1a1a1a" stroke="#555" strokeWidth="1" />
          <text x={c.position.x} y={c.position.y + 3} textAnchor="middle" fill="#888" fontSize="7" fontFamily="monospace">
            {c.number}
          </text>
        </g>
      ))}
    </svg>
  );
}
```

### 9.4 Elevation Profile Chart

```typescript
// apps/web/components/circuits/elevation-profile.tsx
"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function ElevationProfile({ data }: { data: Array<{ distance_m: number; elevation_m: number }> }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <h2 className="font-display text-sm font-bold mb-3">Elevation Profile</h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <XAxis dataKey="distance_m" tickFormatter={(v) => `${(v / 1000).toFixed(1)}km`} stroke="#555" fontSize={10} />
          <YAxis stroke="#555" fontSize={10} unit="m" />
          <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
          <Area type="monotone" dataKey="elevation_m" stroke="#E10600" fill="#E10600" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 9.5 Lap Time Evolution Chart

```typescript
// apps/web/components/circuits/lap-time-evolution.tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatLapTime } from "@pitwall/utils";

// Shows pole position time by year — demonstrates regulation change impacts
// Mark major regulation changes (2009 aero, 2014 turbo hybrid, 2022 ground effect)

export function LapTimeEvolution({ data }: { data: Array<{ year: number; pole_time_ms: number }> }) {
  const regulationChanges = [
    { year: 2009, label: "Aero Regs" },
    { year: 2014, label: "Turbo Hybrid" },
    { year: 2017, label: "Wider Cars" },
    { year: 2022, label: "Ground Effect" },
  ];

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <h2 className="font-display text-sm font-bold mb-3">Pole Position Time Evolution</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="year" stroke="#555" fontSize={10} />
          <YAxis tickFormatter={(v) => formatLapTime(v)} stroke="#555" fontSize={10} />
          {regulationChanges.map((rc) => (
            <ReferenceLine key={rc.year} x={rc.year} stroke="#E10600" strokeDasharray="3 3" label={{ value: rc.label, fill: "#888", fontSize: 8 }} />
          ))}
          <Tooltip formatter={(v: number) => formatLapTime(v)} contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
          <Line type="monotone" dataKey="pole_time_ms" stroke="#FFD700" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 9.6 Circuit Comparison Tool

```typescript
// apps/web/app/(shell)/f1/circuits/compare/page.tsx
// Select 2 circuits via dropdown
// Side-by-side comparison table:
// Length, Turns, Top Speed Record, Typical Strategy, Overtaking Rate,
// Safety Car Probability, DRS Zones, Elevation Change, Weather Risk
```

---

## Acceptance Criteria
- [ ] All circuits page shows grid with country flags
- [ ] Circuit profile renders SVG track map with corners and DRS zones
- [ ] Corner guide lists all turns with type (hairpin/chicane/etc.)
- [ ] Elevation profile chart renders with correct shape
- [ ] Race history table shows all past winners
- [ ] Circuit records display (fastest qualifying, most wins)
- [ ] Lap time evolution chart shows pole times with regulation change markers
- [ ] Circuit comparison tool works with 2 circuits side-by-side

## Key Dependencies
```
recharts (already installed)
@pitwall/db @pitwall/utils
```

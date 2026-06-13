# Phase 7: Historical Database & Encyclopedia (Week 6-8)

## Overview
Build all server-rendered historical data pages: season explorer, race archives with charts, championship standings, all-time records, search, and the "On This Day" widget. These pages are SSR for SEO and use TanStack Query for data fetching.

## Prerequisites
- Phase 1 (Next.js, Prisma schema, shared packages)
- Phase 2 (Jolpica seeder has populated historical data)

## Deliverables
- Season Explorer page (`/f1/seasons`)
- Season Overview page (`/f1/seasons/[year]`)
- Race Archive page (`/f1/seasons/[year]/[round]`) with 11 sub-sections
- Standings pages (`/f1/standings`, `/f1/standings/[year]`)
- Records page (`/f1/records`)
- Search page (`/f1/search`)
- "On This Day" homepage widget
- Calendar page (`/f1/calendar`)

---

## Task Breakdown

### 7.1 Chart Library Setup

```bash
cd apps/web
pnpm add recharts
```

### 7.2 Data Access Layer

Create Prisma query functions for each page's data needs:

```typescript
// apps/web/lib/data/seasons.ts
import { prisma } from "@pitwall/db";

export async function getSeasons() {
  return prisma.f1_seasons.findMany({
    orderBy: { year: "desc" },
    include: {
      champion_driver: { select: { full_name: true, broadcast_name: true } },
      champion_constructor: { select: { name: true, color_primary: true } },
    },
  });
}

export async function getSeasonOverview(year: number) {
  return prisma.f1_races.findMany({
    where: { season_year: year },
    orderBy: { round: "asc" },
    include: {
      circuit: true,
      sessions: { where: { session_type: "R" }, include: { results: { take: 3, orderBy: { finish_position: "asc" }, include: { driver: true, constructor: true } } } },
    },
  });
}
```

```typescript
// apps/web/lib/data/races.ts
import { prisma } from "@pitwall/db";

export async function getRaceArchive(year: number, round: number) {
  const race = await prisma.f1_races.findFirst({
    where: { season_year: year, round },
    include: {
      circuit: true,
      sessions: {
        include: {
          results: { orderBy: { finish_position: "asc" }, include: { driver: true, constructor: true } },
          qualifying_results: { orderBy: { position: "asc" }, include: { driver: true } },
          laps: { orderBy: [{ driver_id: "asc" }, { lap_number: "asc" }] },
          pit_stops: { orderBy: { lap_number: "asc" }, include: { driver: true } },
          penalties: { include: { driver: true } },
          incidents: true,
          race_control_messages: { orderBy: { occurred_at: "asc" } },
          stints: { orderBy: [{ driver_id: "asc" }, { stint_number: "asc" }], include: { driver: true } },
          weather_snapshots: { orderBy: { recorded_at: "asc" } },
        },
      },
    },
  });
  return race;
}
```

```typescript
// apps/web/lib/data/records.ts
import { prisma } from "@pitwall/db";

export async function getMostWins() {
  // Raw SQL for complex aggregations
  return prisma.$queryRaw`
    SELECT d.full_name, d.broadcast_name, d.nationality, COUNT(*) as wins
    FROM f1_results r
    JOIN f1_drivers d ON r.driver_id = d.id
    WHERE r.finish_position = 1
    GROUP BY d.id, d.full_name, d.broadcast_name, d.nationality
    ORDER BY wins DESC
    LIMIT 20
  `;
}

export async function getMostPoles() {
  return prisma.$queryRaw`
    SELECT d.full_name, d.broadcast_name, COUNT(*) as poles
    FROM f1_qualifying_results qr
    JOIN f1_drivers d ON qr.driver_id = d.id
    WHERE qr.position = 1
    GROUP BY d.id, d.full_name, d.broadcast_name
    ORDER BY poles DESC
    LIMIT 20
  `;
}

// ... similar for podiums, points, fastest laps, championships, etc.
```

### 7.3 Season Explorer Page

```typescript
// apps/web/app/(shell)/f1/seasons/page.tsx
import { getSeasons } from "@/lib/data/seasons";
import Link from "next/link";

export const metadata = { title: "F1 Season Archive — PitWall" };

export default async function SeasonsPage() {
  const seasons = await getSeasons();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-6">Season Archive</h1>

      {/* Decade filters */}
      <div className="flex gap-2 mb-6">
        {["2020s", "2010s", "2000s", "1990s", "All"].map((d) => (
          <button key={d} className="px-3 py-1 text-xs bg-bg-surface border border-border-default rounded hover:bg-bg-elevated">
            {d}
          </button>
        ))}
      </div>

      {/* Season grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {seasons.map((s) => (
          <Link
            key={s.year}
            href={`/f1/seasons/${s.year}`}
            className="bg-bg-surface border border-border-default rounded-lg p-4 hover:bg-bg-elevated hover:border-f1-red/30 transition-all"
          >
            <div className="font-display text-xl font-bold text-f1-red">{s.year}</div>
            {s.champion_driver && (
              <div className="text-xs text-text-secondary mt-1">🏆 {s.champion_driver.full_name}</div>
            )}
            {s.champion_constructor && (
              <div className="text-[10px] text-text-muted mt-0.5">{s.champion_constructor.name}</div>
            )}
            {s.total_races && (
              <div className="text-[10px] text-text-muted">{s.total_races} races</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### 7.4 Race Archive Page

```typescript
// apps/web/app/(shell)/f1/seasons/[year]/[round]/page.tsx
import { getRaceArchive } from "@/lib/data/races";
import { FinalClassification } from "@/components/historical/final-classification";
import { LapChart } from "@/components/historical/lap-chart";
import { TireStrategyDiagram } from "@/components/historical/tire-strategy-diagram";
import { GridVsFinish } from "@/components/historical/grid-vs-finish";
import { PitStopSummary } from "@/components/historical/pit-stop-summary";
import { PenaltyLog } from "@/components/historical/penalty-log";
import { WeatherTimeline } from "@/components/historical/weather-timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function RaceArchivePage({ params }: { params: { year: string; round: string } }) {
  const race = await getRaceArchive(parseInt(params.year), parseInt(params.round));
  if (!race) return <div>Race not found</div>;

  const raceSession = race.sessions.find((s) => s.session_type === "R");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-text-muted">{params.year} Season • Round {params.round}</div>
        <h1 className="font-display text-2xl font-bold">{race.race_name}</h1>
        <div className="text-sm text-text-secondary">{race.circuit.name} • {race.circuit.country}</div>
      </div>

      <Tabs defaultValue="classification" className="space-y-4">
        <TabsList className="bg-bg-surface flex-wrap">
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="grid-finish">Grid vs Finish</TabsTrigger>
          <TabsTrigger value="lap-chart">Lap Chart</TabsTrigger>
          <TabsTrigger value="tire-strategy">Tire Strategy</TabsTrigger>
          <TabsTrigger value="pit-stops">Pit Stops</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="race-control">Race Control</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
        </TabsList>

        <TabsContent value="classification">
          <FinalClassification results={raceSession?.results || []} />
        </TabsContent>
        <TabsContent value="grid-finish">
          <GridVsFinish results={raceSession?.results || []} />
        </TabsContent>
        <TabsContent value="lap-chart">
          <LapChart laps={raceSession?.laps || []} />
        </TabsContent>
        <TabsContent value="tire-strategy">
          <TireStrategyDiagram stints={raceSession?.stints || []} totalLaps={race.total_laps || 57} />
        </TabsContent>
        <TabsContent value="pit-stops">
          <PitStopSummary pitStops={raceSession?.pit_stops || []} />
        </TabsContent>
        <TabsContent value="penalties">
          <PenaltyLog penalties={raceSession?.penalties || []} />
        </TabsContent>
        <TabsContent value="race-control">
          {/* Chronological log of all race control messages */}
        </TabsContent>
        <TabsContent value="weather">
          <WeatherTimeline snapshots={raceSession?.weather_snapshots || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 7.5 Key Chart Components

**Lap Chart (Interactive):**
```typescript
// apps/web/components/historical/lap-chart.tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Transform laps data → per-lap position for each driver
// X = lap number, Y = position, one line per driver colored by team
// Hover tooltip shows driver name + position at that lap
```

**Tire Strategy Diagram (Horizontal Bars):**
```typescript
// apps/web/components/historical/tire-strategy-diagram.tsx
// Horizontal bar chart per driver showing stints colored by compound
// Each row = one driver, segments = stints with compound colors
// Width proportional to stint duration (laps)
```

**Grid vs Finish (Bump/Slope Chart):**
```typescript
// apps/web/components/historical/grid-vs-finish.tsx
// Two columns: Grid Position (left) → Finish Position (right)
// Lines connecting each driver's grid to finish
// Green if gained places, red if lost, gray if same
```

### 7.6 Records Page Structure

```typescript
// apps/web/app/(shell)/f1/records/page.tsx
// 13 record categories as expandable sections:
// Most Wins, Most Poles, Most Podiums, Most Points, Most Fastest Laps,
// Most Championships, Most Starts, Most DNFs, Longest Streaks,
// Close Finishes, First/Last Records, Most Laps Led, Qualifying Records
```

### 7.7 Search Page

```typescript
// apps/web/app/(shell)/f1/search/page.tsx
// Full-text search powered by PostgreSQL ts_vector or simple ILIKE
// Autocomplete dropdown with category badges (🏁 Race, 👤 Driver, 🏗️ Team, 🏟️ Circuit)
// Results grouped by category
```

### 7.8 On This Day Widget

```typescript
// apps/web/components/historical/on-this-day.tsx
// Query races where race_date matches today's month/day across all years
// Show: "On this day in {year}, {winner} won the {race_name} at {circuit}"
```

---

## Acceptance Criteria
- [ ] Season explorer shows all seasons as clickable cards with champion info
- [ ] Season overview shows race calendar with top-3 results
- [ ] Race archive page has all 8+ tabbed sections working
- [ ] Lap chart shows interactive line chart (hover for details)
- [ ] Tire strategy shows horizontal colored bars per driver
- [ ] Grid vs Finish visualization shows place gains/losses
- [ ] Pit stop summary table shows all stops with durations
- [ ] Standings page shows driver + constructor championship tables
- [ ] Records page shows top-20 lists for each category
- [ ] Search works with autocomplete across all entity types
- [ ] All pages are SSR (check view-source for content)

## Key Dependencies
```
recharts @tanstack/react-query
@pitwall/db (Prisma queries)
```

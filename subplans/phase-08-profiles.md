# Phase 8: Driver & Constructor Profiles (Week 8-9)

## Overview
Build driver and constructor profile pages with career statistics, season-by-season breakdowns, teammate head-to-head comparisons, performance trajectory charts, and team development trackers.

## Prerequisites
- Phase 7 (historical data queries, chart setup with Recharts)

## Deliverables
- All Drivers list page (`/f1/drivers`)
- Driver Profile page (`/f1/drivers/[id]`) with career stats, charts, H2H
- All Constructors list page (`/f1/constructors`)
- Constructor Profile page (`/f1/constructors/[id]`) with timeline, roster, dev tracker

---

## Task Breakdown

### 8.1 Data Access Layer

```typescript
// apps/web/lib/data/drivers.ts
import { prisma } from "@pitwall/db";

export async function getDriverProfile(driverRef: string) {
  const driver = await prisma.f1_drivers.findUnique({
    where: { driver_ref: driverRef },
  });
  if (!driver) return null;

  // Career stats aggregation
  const stats = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE finish_position = 1) as wins,
      COUNT(*) FILTER (WHERE finish_position <= 3) as podiums,
      COUNT(*) as races,
      SUM(points) as total_points,
      COUNT(*) FILTER (WHERE classification = 'DNF') as dnfs,
      AVG(NULLIF(finish_position, 0)) as avg_finish,
      AVG(NULLIF(grid_position, 0)) as avg_grid
    FROM f1_results WHERE driver_id = ${driver.id}
  `;

  const poles = await prisma.$queryRaw`
    SELECT COUNT(*) as poles
    FROM f1_qualifying_results WHERE driver_id = ${driver.id} AND position = 1
  `;

  const fastestLaps = await prisma.f1_results.count({
    where: { driver_id: driver.id, fastest_lap: true },
  });

  // Season-by-season breakdown
  const seasonBreakdown = await prisma.$queryRaw`
    SELECT
      r.season_year as year,
      c.name as team, c.color_primary as team_color,
      COUNT(*) as races,
      COUNT(*) FILTER (WHERE res.finish_position = 1) as wins,
      COUNT(*) FILTER (WHERE res.finish_position <= 3) as podiums,
      SUM(res.points) as points,
      ds.position as championship_position
    FROM f1_results res
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_constructors c ON res.constructor_id = c.id
    LEFT JOIN f1_driver_standings ds ON ds.driver_id = ${driver.id}
      AND ds.season_year = r.season_year
      AND ds.round = (SELECT MAX(round) FROM f1_driver_standings WHERE season_year = r.season_year AND driver_id = ${driver.id})
    WHERE res.driver_id = ${driver.id} AND s.session_type = 'R'
    GROUP BY r.season_year, c.name, c.color_primary, ds.position
    ORDER BY r.season_year DESC
  `;

  return { driver, stats, poles, fastestLaps, seasonBreakdown };
}

export async function getTeammateComparison(driverId: number, season: number) {
  // Find teammate (same constructor, same season, different driver)
  const teammates = await prisma.$queryRaw`
    SELECT DISTINCT re2.driver_id, d.broadcast_name, d.full_name
    FROM f1_race_entries re1
    JOIN f1_race_entries re2 ON re1.race_id = re2.race_id AND re1.constructor_id = re2.constructor_id AND re1.driver_id != re2.driver_id
    JOIN f1_races r ON re1.race_id = r.id
    JOIN f1_drivers d ON re2.driver_id = d.id
    WHERE re1.driver_id = ${driverId} AND r.season_year = ${season}
  `;

  // Qualifying H2H, Race H2H, points comparison
  // ... complex query comparing qualifying positions and race finishes where both finished
  return teammates;
}
```

### 8.2 Driver Profile Page

```typescript
// apps/web/app/(shell)/f1/drivers/[id]/page.tsx
import { getDriverProfile } from "@/lib/data/drivers";
import { DriverHeaderCard } from "@/components/profiles/driver-header-card";
import { CareerStatsGrid } from "@/components/profiles/career-stats-grid";
import { SeasonBreakdownTable } from "@/components/profiles/season-breakdown-table";
import { PerformanceCharts } from "@/components/profiles/performance-charts";
import { TeammateH2H } from "@/components/profiles/teammate-h2h";

export default async function DriverProfilePage({ params }: { params: { id: string } }) {
  const data = await getDriverProfile(params.id);
  if (!data) return <div>Driver not found</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <DriverHeaderCard driver={data.driver} />
      <CareerStatsGrid stats={data.stats} poles={data.poles} fastestLaps={data.fastestLaps} />
      <SeasonBreakdownTable seasons={data.seasonBreakdown} />
      <PerformanceCharts seasonData={data.seasonBreakdown} driverId={data.driver.id} />
      <TeammateH2H driverId={data.driver.id} />
    </div>
  );
}
```

### 8.3 Key Profile Components

**Career Stats Grid (12 stats):**
```typescript
// apps/web/components/profiles/career-stats-grid.tsx
// Grid of 12 stat cards (3×4):
// Championships, Wins (+ win%), Podiums (+ podium%), Poles, Fastest Laps,
// Career Points, Race Starts, Best Championship, Avg Qualifying Pos,
// Avg Finish Pos, DNF Rate, Points Per Race
// Each card: large number + label + optional sparkline
```

**Season Breakdown Table:**
```typescript
// apps/web/components/profiles/season-breakdown-table.tsx
// Table with columns: Year, Team (with color stripe), Races, Wins, Podiums,
// Poles, FL, Points, Championship Position, Teammate, H2H Qual, H2H Race
// Team color stripe on left of each row
```

**Performance Charts (6 charts):**
```typescript
// apps/web/components/profiles/performance-charts.tsx
// 1. Championship Position by Season — Line chart (Y inverted, P1 at top)
// 2. Points Scored by Season — Bar chart
// 3. Average Finishing Position — Line chart
// 4. Qualifying vs Race Delta — Bar chart (positive = gained places)
// 5. Wet vs Dry radar chart (comparing avg finish, wins, podiums in wet/dry)
// 6. Circuit Performance Heatmap — Grid: circuits × years, colored by result
```

### 8.4 Constructor Profile Page

```typescript
// apps/web/app/(shell)/f1/constructors/[id]/page.tsx
// Similar structure to driver but with:
// - Team timeline (predecessor chain visualization)
// - Driver roster history table (all drivers who raced for this team, by season)
// - Car development tracker (race-by-race pace relative to fastest team)
// - Team stats (championships, wins, reliability rate, avg pit stop time)
```

### 8.5 Team Timeline Visualization

```typescript
// apps/web/components/profiles/team-timeline.tsx
// Horizontal timeline showing team name changes:
// e.g., Toleman (1984) → Benetton (1986) → Renault (2001) → Lotus (2012) → Renault (2016) → Alpine (2021)
// Uses predecessor_id from f1_constructors table to build chain
// Each segment colored by team color, clickable to that team's profile
```

---

## Acceptance Criteria
- [ ] All Drivers page shows grid/list with filters (active/historical, nationality)
- [ ] Driver profile shows headshot, name, number, team, nationality
- [ ] 12 career stat cards display with correct values
- [ ] Season-by-season table shows all seasons with team, results, H2H
- [ ] 6 performance charts render with correct data
- [ ] Teammate H2H shows qualifying and race comparison with dropdown for season
- [ ] Constructor profile shows team stats and timeline
- [ ] Team timeline correctly chains predecessors
- [ ] Driver roster history table shows all past drivers per season
- [ ] Car development tracker shows pace chart with upgrade markers

## Key Dependencies
```
recharts (already installed)
@pitwall/db (Prisma queries with raw SQL for aggregations)
```

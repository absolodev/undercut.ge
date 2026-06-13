# Phase 1: Foundation (Week 1-2)

## Overview
Initialize the entire project skeleton: Turborepo monorepo, Next.js app with F1 theming, Docker infrastructure, database schema, and shared packages. After this phase, the app shell renders with the 4-panel layout, database is seeded, and all shared code is importable.

## Prerequisites
- Node.js 20+, pnpm 9+, Docker Desktop installed
- PostgreSQL and Redis accessible via Docker

## Deliverables
- Turborepo monorepo with `apps/web`, `packages/*`, `services/*`
- Next.js 15 app with App Router, TypeScript strict mode
- Tailwind CSS + Shadcn UI with full F1 dark theme
- Docker Compose running TimescaleDB + Redis
- Prisma ORM with all 20+ tables from master plan
- Shared packages: `@pitwall/types`, `@pitwall/constants`, `@pitwall/utils`
- Working AppShell layout rendering at `localhost:3000`

---

## Task Breakdown

### 1.1 Initialize Turborepo Monorepo

```bash
cd /Users/nika/Sources/Personal/Codes/F1
pnpm init
pnpm add -Dw turbo
mkdir -p apps/web apps/desktop apps/mobile
mkdir -p packages/types packages/constants packages/utils packages/db
mkdir -p packages/api-client packages/socket-client packages/stores
mkdir -p services/ingestion services/ws-server services/enrichment
mkdir -p infra assets/track-maps assets/icons assets/fonts
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
```

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}
```

### 1.2 Initialize Next.js App

```bash
cd apps/web
pnpm dlx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm --no-turbopack
```

**Key `next.config.ts` settings:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@pitwall/types",
    "@pitwall/constants",
    "@pitwall/utils",
    "@pitwall/stores",
    "@pitwall/socket-client",
    "@pitwall/api-client",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.formula1.com" },
      { protocol: "https", hostname: "*.openf1.org" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
```

### 1.3 Install & Configure Tailwind + Shadcn UI

```bash
cd apps/web
pnpm dlx shadcn@latest init
# Choose: New York style, Zinc base color, CSS variables: yes
```

**`tailwind.config.ts` — Full F1 Theme:**
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        "f1-red": "#E10600",
        "f1-red-dark": "#8B0000",
        // Backgrounds
        "bg-primary": "#000000",
        "bg-surface": "#111111",
        "bg-elevated": "#1A1A1A",
        // Borders
        "border-default": "#2A2A2A",
        // Text
        "text-primary": "#FFFFFF",
        "text-secondary": "#888888",
        "text-muted": "#555555",
        // Sectors
        "sector-purple": "#A020F0",
        "sector-green": "#00FF00",
        "sector-yellow": "#FFD700",
        "sector-red": "#FF0000",
        // Tires
        "tire-soft": "#FF0000",
        "tire-medium": "#FFD700",
        "tire-hard": "#FFFFFF",
        "tire-inter": "#00CC00",
        "tire-wet": "#0066FF",
        // Flags
        "flag-green": "#00FF00",
        "flag-yellow": "#FFD700",
        "flag-red": "#FF0000",
        "flag-blue": "#0000FF",
        "flag-sc": "#FFA500",
        // Teams (2025 — loaded dynamically in production)
        "team-red-bull": "#3671C6",
        "team-mercedes": "#27F4D2",
        "team-ferrari": "#E8002D",
        "team-mclaren": "#FF8000",
        "team-aston-martin": "#229971",
        "team-alpine": "#FF87BC",
        "team-williams": "#64C4FF",
        "team-rb": "#6692FF",
        "team-sauber": "#52E252",
        "team-haas": "#B6BABD",
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "SFMono-Regular", "Consolas", "monospace"],
      },
      animation: {
        "position-change": "slideIn 300ms ease-out",
        "sector-flash": "flash 800ms ease-out",
        "flag-pulse": "pulse 2s ease-in-out",
        "slide-in-right": "slideInRight 400ms ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        flash: {
          "0%": { opacity: "1", filter: "brightness(1.5)" },
          "100%": { opacity: "1", filter: "brightness(1)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**`app/globals.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 0%;        /* #000000 true black */
  --foreground: 0 0% 100%;
  --card: 0 0% 6.7%;            /* #111111 */
  --card-foreground: 0 0% 100%;
  --popover: 0 0% 6.7%;
  --popover-foreground: 0 0% 100%;
  --primary: 1 100% 44%;        /* #E10600 F1 Red */
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 10.2%;      /* #1A1A1A */
  --secondary-foreground: 0 0% 100%;
  --muted: 0 0% 16.5%;
  --muted-foreground: 0 0% 53.3%;
  --accent: 0 0% 10.2%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 100% 44%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 16.5%;         /* #2A2A2A */
  --input: 0 0% 16.5%;
  --ring: 1 100% 44%;
  --radius: 0.5rem;
}

/* Force dark mode globally — no light mode for this app */
html {
  color-scheme: dark;
}

body {
  background: #000000;
  color: #ffffff;
  font-feature-settings: "tnum"; /* tabular numbers for alignment */
  -webkit-font-smoothing: antialiased;
}

/* Monospace numbers for timing data */
.font-timing {
  font-family: var(--font-jetbrains), monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

### 1.4 Font Setup

**`app/layout.tsx`:**
```typescript
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "PitWall — F1 Command Center",
  description: "Real-time Formula 1 companion for race day and beyond",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable} ${orbitron.variable}`}>
      <body className="font-sans bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
```

### 1.5 AppShell Layout (100vh 4-Panel Grid)

**`app/(shell)/layout.tsx`:**
```typescript
import { AppHeader } from "@/components/shell/app-header";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

**`components/shell/app-header.tsx`:**
```typescript
export function AppHeader() {
  return (
    <header className="h-10 bg-bg-primary border-b border-border-default flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-bold tracking-wider">PITWALL</span>
        {/* Sport switcher dropdown — F1 only for now */}
        <select className="bg-bg-surface text-xs border border-border-default rounded px-2 py-0.5">
          <option>🏎️ Formula 1</option>
          <option disabled>🏍️ MotoGP (Soon)</option>
          <option disabled>🏎️ WEC (Soon)</option>
        </select>
      </div>
      {/* Session status elements will be added in Phase 6 */}
      <div className="flex-1" />
      <div className="text-xs text-text-muted font-mono">v0.1.0</div>
    </header>
  );
}
```

**`app/(shell)/f1/live/page.tsx` — Live Console Grid:**
```typescript
export default function LiveConsolePage() {
  return (
    <div className="h-full grid grid-cols-[280px_1fr_300px] grid-rows-[1fr_80px] gap-px bg-border-default">
      {/* Left: Timing Tower */}
      <div className="bg-bg-primary row-span-1 overflow-y-auto">
        <div className="p-2 text-xs text-text-muted">TIMING TOWER (Phase 4)</div>
      </div>
      {/* Center: Track Map */}
      <div className="bg-bg-primary row-span-1">
        <div className="p-2 text-xs text-text-muted">TRACK MAP (Phase 5)</div>
      </div>
      {/* Right: Race Control / Radio */}
      <div className="bg-bg-primary row-span-1 overflow-y-auto">
        <div className="p-2 text-xs text-text-muted">RACE CONTROL (Phase 6)</div>
      </div>
      {/* Bottom: Info Bar */}
      <div className="bg-bg-surface col-span-3 flex items-center gap-4 px-4">
        <div className="text-xs text-text-muted">BOTTOM BAR (Phase 6)</div>
      </div>
    </div>
  );
}
```

### 1.6 Docker Compose

**`infra/docker-compose.yml`:**
```yaml
version: "3.9"
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: pitwall
      POSTGRES_USER: pitwall
      POSTGRES_PASSWORD: pitwall_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pitwall"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

**Start:** `docker compose -f infra/docker-compose.yml up -d`

### 1.7 Prisma Setup (packages/db)

```bash
cd packages/db
pnpm init
pnpm add prisma @prisma/client
pnpm prisma init --datasource-provider postgresql
```

**`packages/db/prisma/schema.prisma`:**
The full schema from MASTER_PLAN.md Section 12 — all tables including:
- `sports`, `f1_circuits`, `f1_drivers`, `f1_constructors`
- `f1_seasons`, `f1_races`, `f1_sessions`
- `f1_race_entries`, `f1_results`, `f1_qualifying_results`
- `f1_laps`, `f1_pit_stops`, `f1_stints`
- `f1_penalties`, `f1_incidents`
- `f1_race_control_messages`, `f1_team_radio`
- `f1_weather_snapshots`
- `f1_driver_standings`, `f1_constructor_standings`
- `f1_telemetry`, `f1_speed_traps`

**`packages/db/.env`:**
```
DATABASE_URL="postgresql://pitwall:pitwall_dev@localhost:5432/pitwall"
```

**`packages/db/src/client.ts`:**
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

### 1.8 Shared Packages

**`packages/types/src/index.ts`:**
```typescript
// Core F1 data types — mirror DB schema
export interface Driver {
  id: number;
  driverRef: string;
  broadcastName: string; // 'VER'
  firstName: string;
  lastName: string;
  permanentNumber: number;
  nationality: string;
  countryCode: string;
  headshotUrl?: string;
  isActive: boolean;
}

export interface Constructor {
  id: number;
  constructorRef: string;
  name: string;
  colorPrimary: string;
  colorSecondary?: string;
  isActive: boolean;
}

// Live data types
export interface LiveStanding {
  driverNumber: number;
  position: number;
  broadcastName: string;
  teamColor: string;
  gapToLeader: string;
  interval: string;
  lastLapMs: number | null;
  sector1Ms: number | null;
  sector2Ms: number | null;
  sector3Ms: number | null;
  compound: TireCompound | null;
  tyreAge: number;
  pitStops: number;
  penalties: Penalty[];
  isInPit: boolean;
  isRetired: boolean;
  retirementReason?: string;
  hasFastestLap: boolean;
}

export type TireCompound = "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET";
export type TrackStatus = "GREEN" | "YELLOW" | "DOUBLE_YELLOW" | "SC" | "VSC" | "RED";
export type SessionType = "FP1" | "FP2" | "FP3" | "Q" | "SQ" | "S" | "R";
export type SectorColor = "purple" | "green" | "yellow" | "red" | "none";

export interface Penalty {
  type: PenaltyType;
  reason: string;
  lap: number;
  timeAddedSec?: number;
  gridPlaces?: number;
  regulationRef?: string;
  isServed: boolean;
}

export type PenaltyType =
  | "5_SEC" | "10_SEC"
  | "DRIVE_THROUGH" | "STOP_GO_5" | "STOP_GO_10"
  | "GRID_5" | "GRID_10" | "GRID_3"
  | "DSQ" | "REPRIMAND" | "WARNING" | "TRACK_LIMITS"
  | "BLACK_WHITE_FLAG";

export interface CarPosition {
  driverNumber: number;
  x: number;
  y: number;
  z: number;
}

export interface CarTelemetry {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: boolean;
  drs: number;
}

export interface WeatherData {
  airTemperature: number;
  trackTemperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  rainfall: boolean;
}

export interface RaceControlMessage {
  id: string;
  lap: number;
  category: "Flag" | "SafetyCar" | "Penalty" | "Drs" | "Investigation" | "TrackLimits" | "Other";
  flag?: string;
  message: string;
  driverNumber?: number;
  sector?: number;
  timestamp: string;
}

export interface TeamRadioMessage {
  id: string;
  driverNumber: number;
  broadcastName: string;
  teamColor: string;
  recordingUrl?: string;
  lap: number;
  timestamp: string;
}
```

**`packages/constants/src/index.ts`:**
```typescript
export const TIRE_COLORS: Record<string, string> = {
  SOFT: "#FF0000",
  MEDIUM: "#FFD700",
  HARD: "#FFFFFF",
  INTERMEDIATE: "#00CC00",
  WET: "#0066FF",
};

export const SECTOR_COLORS = {
  purple: "#A020F0",
  green: "#00FF00",
  yellow: "#FFD700",
  red: "#FF0000",
  none: "#555555",
} as const;

export const FLAG_COLORS = {
  GREEN: "#00FF00",
  YELLOW: "#FFD700",
  DOUBLE_YELLOW: "#FFD700",
  RED: "#FF0000",
  BLUE: "#0000FF",
  SC: "#FFA500",
  VSC: "#FFA500",
  CHEQUERED: "#FFFFFF",
} as const;

export const PENALTY_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  "5_SEC": { label: "5-Second Time Penalty", icon: "⏱️5", description: "5 seconds added to race time or served during pit stop." },
  "10_SEC": { label: "10-Second Time Penalty", icon: "⏱️10", description: "10 seconds added to race time or served during pit stop." },
  "DRIVE_THROUGH": { label: "Drive-Through Penalty", icon: "🔄", description: "Must drive through pit lane at pit speed limit." },
  "STOP_GO_5": { label: "5-Second Stop-Go", icon: "🛑5", description: "Must pit, stop for 5 seconds, no work on car allowed." },
  "STOP_GO_10": { label: "10-Second Stop-Go", icon: "🛑10", description: "Must pit, stop for 10 seconds, no work on car allowed." },
  "GRID_3": { label: "3-Place Grid Penalty", icon: "⬇️3", description: "Drop 3 grid positions at next race." },
  "GRID_5": { label: "5-Place Grid Penalty", icon: "⬇️5", description: "Drop 5 grid positions at next race." },
  "GRID_10": { label: "10-Place Grid Penalty", icon: "⬇️10", description: "Drop 10 grid positions at next race." },
  "DSQ": { label: "Disqualification", icon: "❌", description: "Excluded from session results." },
  "REPRIMAND": { label: "Reprimand", icon: "📝", description: "Formal warning. 3 reprimands = grid penalty." },
  "WARNING": { label: "Warning", icon: "⚠️", description: "Official warning, no time/grid penalty." },
  "TRACK_LIMITS": { label: "Track Limits Violation", icon: "⚫", description: "3 violations in qualifying = lap deleted. Cumulative warnings in race." },
  "BLACK_WHITE_FLAG": { label: "Black & White Flag", icon: "🏴", description: "Warning for unsportsmanlike behavior." },
};

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1] as const;
```

**`packages/utils/src/index.ts`:**
```typescript
/** Format milliseconds to lap time string: "1:23.456" */
export function formatLapTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return minutes > 0 ? `${minutes}:${seconds.padStart(6, "0")}` : seconds;
}

/** Format gap string: "+1.234" or "+1 LAP" */
export function formatGap(gap: string | number | null): string {
  if (gap == null) return "—";
  if (typeof gap === "string") return gap;
  return gap > 0 ? `+${gap.toFixed(3)}` : gap.toFixed(3);
}

/** Linear interpolation */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.min(Math.max(t, 0), 1);
}

/** Clamp a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/** Get sector color based on timing comparison */
export function getSectorColor(isOverallBest: boolean, isPersonalBest: boolean): string {
  if (isOverallBest) return "purple";
  if (isPersonalBest) return "green";
  return "yellow";
}
```

### 1.9 Root package.json Scripts

```json
{
  "name": "pitwall",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "db:up": "docker compose -f infra/docker-compose.yml up -d",
    "db:down": "docker compose -f infra/docker-compose.yml down",
    "db:generate": "turbo db:generate --filter=@pitwall/db",
    "db:push": "turbo db:push --filter=@pitwall/db",
    "db:studio": "pnpm --filter @pitwall/db prisma studio"
  }
}
```

---

## Acceptance Criteria
- [ ] `pnpm install` succeeds with no errors
- [ ] `pnpm dev` starts Next.js at localhost:3000
- [ ] AppShell renders with header (PitWall logo + sport switcher) and 4-panel grid
- [ ] `pnpm db:up` starts PostgreSQL + Redis containers
- [ ] `pnpm db:push` creates all tables in PostgreSQL
- [ ] `pnpm db:studio` opens Prisma Studio showing empty tables
- [ ] All shared packages importable from `apps/web`
- [ ] Tailwind F1 colors render correctly (true black bg, red accents)
- [ ] Three fonts load: Orbitron (display), Inter (UI), JetBrains Mono (data)
- [ ] TypeScript strict mode passes with no errors

## Key Dependencies
```
# Root
turbo pnpm

# apps/web
next@15 react@19 react-dom@19 typescript
tailwindcss tailwindcss-animate
@tailwindcss/typography
lucide-react class-variance-authority clsx tailwind-merge

# packages/db
prisma @prisma/client
```

# 🏎️ F1 Command Center — Master Architecture & Implementation Plan

> **Project Codename:** `PitWall`
> **Version:** 3.0 — Comprehensive Master Plan
> **Date:** June 2026
> **Target Platforms:** Web (Next.js) → Desktop (Electron) → Mobile (Expo/React Native)

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Data Sources & API Inventory](#2-data-sources--api-inventory)
3. [System Architecture](#3-system-architecture)
4. [Design System & Visual Language](#4-design-system--visual-language)
5. [Feature Set: Live Race Console (Second Screen)](#5-feature-set-live-race-console)
6. [Feature Set: Session Analysis (Practice, Qualifying, Sprint)](#6-feature-set-session-analysis)
7. [Feature Set: Historical Database & Encyclopedia](#7-feature-set-historical-database--encyclopedia)
8. [Feature Set: Driver & Constructor Profiles](#8-feature-set-driver--constructor-profiles)
9. [Feature Set: Commentator & Analyst Pro Tools](#9-feature-set-commentator--analyst-pro-tools)
10. [Feature Set: Circuit Encyclopedia](#10-feature-set-circuit-encyclopedia)
11. [Feature Set: Multi-Sport Shell & Navigation](#11-feature-set-multi-sport-shell--navigation)
12. [Database Schema (PostgreSQL)](#12-database-schema-postgresql)
13. [Redis Schema (Live State & Streams)](#13-redis-schema-live-state--streams)
14. [Real-Time Data Pipeline](#14-real-time-data-pipeline)
15. [Frontend Architecture](#15-frontend-architecture)
16. [Cross-Platform Strategy](#16-cross-platform-strategy)
17. [Monorepo Structure](#17-monorepo-structure)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [Testing Strategy](#19-testing-strategy)
20. [Performance Budgets & Optimization](#20-performance-budgets--optimization)
21. [Implementation Phases](#21-implementation-phases)
22. [Appendix: F1 Regulation Reference Data](#22-appendix-f1-regulation-reference-data)

---

## 1. Executive Summary & Vision

### What This Is
A **broadcast-grade, real-time second-screen companion application** for Formula 1 — built for hardcore fans, data analysts, fantasy players, and commentators. Think of it as a **professional pit wall console** that anyone can use.

### Core Use Cases
| Persona | Primary Use | Key Features |
|---------|------------|--------------|
| **Race Day Fan** | Watch map + standings on second screen during live race | Live track map, timing tower, race control feed |
| **Data Analyst** | Compare telemetry, analyze tire strategy, study pace trends | Telemetry overlay, stint analysis, pace delta charts |
| **Commentator/Journalist** | Quick access to stats, records, and context during broadcast | Instant stat lookup, head-to-head, historical records |
| **Fantasy Player** | Track driver form, consistency, and upcoming circuit suitability | Driver form tracker, circuit history, points projections |
| **Casual Browser** | Explore F1 history, learn about circuits, drivers, and records | Encyclopedia mode, season archives, "on this day" |

### What Makes This Different From Existing Tools
| Existing Tool | Gap We Fill |
|--------------|-------------|
| **Official F1 App** | No telemetry comparisons, limited historical depth, no desktop optimization, no offline analysis |
| **MultiViewer for F1** | Focused on video streams, not data-first; no historical database |
| **FastF1 (Python)** | Code-only, no GUI; requires Python knowledge; post-session only |
| **Ergast/Jolpica** | Results-only API, no live data, no telemetry, no visualization |
| **F1 TV Broadcast** | Passive viewing; can't drill into specific comparisons on demand |

### Non-Goals (v1)
- We are **NOT** streaming F1 video content (legal/DRM issues)
- We are **NOT** building a social network or chat
- We are **NOT** doing betting/gambling features
- We are **NOT** building AI race predictions (v2+ consideration)

---

## 2. Data Sources & API Inventory

### 2.1 Primary: OpenF1 API (Real-Time + Recent Historical)

> **Base URL:** `https://api.openf1.org/v1/`
> **Auth:** None for historical, OAuth2 Bearer for real-time premium
> **Rate Limits:** 3 req/s, 30 req/min (free tier); doubled for supporters
> **Data Coverage:** 2023–present (real-time during live sessions)
> **Format:** JSON, CSV
> **Latency:** ~3 second delay from live

#### Complete Endpoint Map

| Endpoint | Description | Update Freq | Key Fields |
|----------|------------|-------------|------------|
| `/car_data` | High-frequency car telemetry | ~3.7 Hz | `speed`, `rpm`, `n_gear`, `throttle`, `brake`, `drs` |
| `/drivers` | Driver metadata for session | Per session | `driver_number`, `broadcast_name`, `team_name`, `team_colour`, `headshot_url`, `country_code` |
| `/intervals` | Gap to leader and car ahead | ~4 Hz | `gap_to_leader`, `interval` |
| `/laps` | Lap-by-lap timing data | Per lap | `lap_number`, `lap_duration`, `duration_sector_1/2/3`, `is_pit_out_lap`, `segments_sector_1/2/3` (mini-sector colors) |
| `/location` | Car X/Y/Z position on track | ~3.7 Hz | `x`, `y`, `z` (1/10th meter coordinates) |
| `/meetings` | Race weekend metadata | Static | `meeting_name`, `meeting_key`, `circuit_key`, `circuit_short_name`, `country_name`, `date_start` |
| `/pit` | Pit stop events | Per event | `pit_duration`, `lap_number` |
| `/position` | Track position order | ~3.7 Hz | `position`, `driver_number` |
| `/race_control` | FIA race control messages | Per event | `message`, `flag`, `category`, `scope`, `sector`, `lap_number` |
| `/sessions` | Session details (FP/Q/S/R) | Static | `session_name`, `session_type`, `date_start`, `date_end`, `session_key` |
| `/stints` | Tire usage per stint | Per event | `compound`, `stint_number`, `lap_start`, `lap_end`, `tyre_age_at_start` |
| `/team_radio` | Team radio clips | Per event | `recording_url`, `driver_number` |
| `/weather` | Track weather conditions | ~60s | `air_temperature`, `track_temperature`, `humidity`, `pressure`, `rainfall`, `wind_direction`, `wind_speed` |

### 2.2 Secondary: Jolpica F1 API (Historical Results — Ergast Successor)

> **Base URL:** `https://api.jolpi.ca/ergast/f1/`
> **Auth:** None
> **Rate Limits:** ~4 req/s, ~500 req/hr
> **Data Coverage:** 1950–present (results, standings, circuits)
> **Format:** JSON

#### Endpoint Map

| Endpoint | Description |
|----------|------------|
| `/circuits` | All circuits metadata (name, location, lat/lng, country) |
| `/constructors` | Constructor/team metadata |
| `/{season}/constructorstandings` | Constructor championship standings per season |
| `/drivers` | Driver metadata (dob, nationality, number, code) |
| `/{season}/driverstandings` | Driver championship standings per season |
| `/{season}/{round}/laps` | Lap-by-lap positions and times |
| `/{season}/{round}/pitstops` | Pit stop data per race |
| `/{season}/qualifying` | Qualifying results (Q1/Q2/Q3 times) |
| `/races` | Race schedule and metadata |
| `/results` | Race results (grid, position, points, status, time) |
| `/seasons` | Available seasons |
| `/sprint` | Sprint race results |
| `/status` | All possible race completion statuses (Finished, DNF reasons) |

### 2.3 Tertiary: F1 Live Timing (SignalR — Direct Feed)

> **Protocol:** SignalR (WebSocket upgrade from `wss://livetiming.formula1.com/signalr`)
> **Auth:** F1 TV subscription JWT required for telemetry streams
> **Compression:** `.z` suffix = zlib/gzip compressed JSON
> **Frequency:** CarData/Position at ~3.7 Hz; timing/race control on-event

#### SignalR Topics (Complete List)

| Topic | Description | Frequency |
|-------|------------|-----------|
| `AudioStreams` | Audio stream metadata | On event |
| `CarData.z` | Compressed telemetry (speed, RPM, gear, throttle, brake, DRS) | ~3.7 Hz |
| `ChampionshipPrediction` | Live championship point projections | Per lap |
| `ContentStreams` | Content stream metadata | On event |
| `DriverList` | Driver info, team colors, tla codes | Session start |
| `ExtrapolatedClock` | Synchronized session clock | ~1 Hz |
| `Heartbeat` | Connection keepalive | ~1 Hz |
| `LapCount` | Current lap / total laps | Per lap |
| `Position.z` | Compressed X/Y/Z car positions | ~3.7 Hz |
| `RaceControlMessages` | FIA messages, flags, investigations, penalties | On event |
| `RcmSeries` | Race control message series data | On event |
| `SessionData` | Session status changes | On event |
| `SessionInfo` | Session metadata (type, start time, track) | Session start |
| `SessionStatus` | Active/Inactive/Finished | On event |
| `TeamRadio` | Team radio clip URLs | On event |
| `TimingAppData` | Extended timing (stints, speed traps) | On event |
| `TimingData` | Primary timing (sectors, gaps, intervals, mini-sectors) | ~1-2 Hz |
| `TimingStats` | Aggregated best times, speed records | On event |
| `TopThree` | Current top 3 positions | Per change |
| `TrackStatus` | Green/Yellow/SC/VSC/Red flag status | On event |
| `WeatherData` | Air temp, track temp, humidity, wind, rain | ~60s |

### 2.4 FastF1 Python Library (Post-Session Telemetry Enrichment)

> **Install:** `pip install fastf1`
> **Use Case:** Backend worker for post-session data enrichment — NOT for live use
> **Data Source:** Combines F1 live timing + Ergast into clean DataFrames

#### Available Telemetry Channels (per car, per lap)

| Channel | Type | Description |
|---------|------|-------------|
| `Speed` | float | km/h |
| `RPM` | float | Engine RPM |
| `nGear` | int | Current gear (1-8) |
| `Throttle` | float | 0-100% |
| `Brake` | bool | True if braking |
| `DRS` | int | 0=unavailable, 1=available, 2=active |
| `X` | float | Track position X (1/10 meter) |
| `Y` | float | Track position Y (1/10 meter) |
| `Z` | float | Track position Z (elevation, 1/10 meter) |
| `Time` | timedelta | Time offset within lap |
| `Distance` | float | Distance into lap (meters) |

#### Additional FastF1 Data
- Lap times with sector splits
- Pit stop durations and in/out laps
- Tire compounds and stint details
- Weather data per timestamp
- Session results and classifications
- Track status changes
- Speed trap data

### 2.5 Weather: WeatherAPI.com (Preferred) + OpenWeatherMap (Fallback)

| Feature | WeatherAPI.com (Free) | OpenWeatherMap (Free) |
|---------|----------------------|----------------------|
| API Calls | ~1M/month | 1,000/day |
| Forecast | Up to 14 days | 5-day / 3-hour |
| Historical | ~7 days back | Limited |
| Granularity | 15-min intervals | 3-hour intervals |
| Coord-based | ✅ lat/lng | ✅ lat/lng |

**Implementation:** Use circuit lat/lng coordinates to get hyper-local weather. Poll every 5 minutes during race sessions, cache in Redis with 2-minute TTL.

### 2.6 Static Assets & Media

| Asset | Source | Notes |
|-------|--------|-------|
| Driver headshots | OpenF1 `headshot_url` field | Auto-cached locally |
| Team logos | Self-hosted (manually curated) | Update yearly |
| Circuit SVG maps | Community sources + self-traced | Coordinate-mapped to match X/Y telemetry |
| Country flags | `flag-icons` npm package | ISO country codes |
| Tire compound icons | Self-designed SVGs | Soft/Med/Hard/Inter/Wet |
| Flag icons | Self-designed SVGs | Green/Yellow/Red/Blue/Black/Chequered |

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │  OpenF1   │  │ Jolpica  │  │ Weather  │  │ F1 Live Timing   │    │
│  │  REST API │  │ REST API │  │   API    │  │ (SignalR/WS)     │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │
└───────┼──────────────┼──────────────┼────────────────┼──────────────┘
        │              │              │                │
        ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER (Node.js Workers)                │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │ REST Poller    │  │ Historical     │  │ SignalR Client       │   │
│  │ (OpenF1 @1Hz)  │  │ Seed Worker   │  │ (Live Timing WS)     │   │
│  │                │  │ (Jolpica)     │  │ Decompress .z data   │   │
│  └───────┬────────┘  └───────┬───────┘  └──────────┬────────────┘   │
│          │                   │                     │                 │
│          ▼                   ▼                     ▼                 │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    BullMQ Job Queue                           │    │
│  │   parse:telemetry | parse:timing | archive:post-session      │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│                                                                      │
│  ┌────────────────────┐        ┌────────────────────────────────┐   │
│  │      Redis          │        │        PostgreSQL               │   │
│  │                    │        │                                │   │
│  │ • Live state       │        │ • Seasons, Races, Circuits     │   │
│  │   (standings,      │        │ • Drivers, Constructors        │   │
│  │    weather, flags)  │        │ • Results, Qualifying          │   │
│  │ • Redis Streams    │        │ • Lap times, Pit stops         │   │
│  │   (telemetry @5Hz) │        │ • Penalties, Incidents         │   │
│  │ • Pub/Sub channels │        │ • Telemetry snapshots          │   │
│  │   (race_control,   │        │ • (TimescaleDB for time-series)│   │
│  │    team_radio)     │        │                                │   │
│  │ • Session cache    │        │                                │   │
│  │   (TTL-based)      │        │                                │   │
│  └────────┬───────────┘        └────────────────┬───────────────┘   │
│           │                                     │                   │
└───────────┼─────────────────────────────────────┼───────────────────┘
            │                                     │
            ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API & STREAMING LAYER                           │
│                                                                      │
│  ┌────────────────────────┐    ┌────────────────────────────────┐   │
│  │   Next.js API Routes    │    │   WebSocket Server (Socket.io)  │   │
│  │                        │    │                                │   │
│  │ GET /api/races         │    │  Rooms:                        │   │
│  │ GET /api/drivers/:id   │    │   • live:race (standings, map) │   │
│  │ GET /api/telemetry     │    │   • live:telemetry:car:{n}     │   │
│  │ GET /api/standings     │    │   • live:race_control          │   │
│  │ GET /api/compare       │    │   • live:team_radio            │   │
│  │ GET /api/search        │    │   • live:weather               │   │
│  └────────────┬───────────┘    └──────────────┬─────────────────┘   │
│               │                               │                     │
└───────────────┼───────────────────────────────┼─────────────────────┘
                │                               │
                ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐    │
│  │  Next.js Web   │  │   Electron    │  │   Expo / React       │    │
│  │  (Browser)     │  │   (Desktop)   │  │   Native (Mobile)    │    │
│  │               │  │               │  │                      │    │
│  │ React + Zustand + Canvas/WebGL + Socket.io Client           │    │
│  └───────────────┘  └───────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Why This Architecture?

**The Single-Ingestor Pattern** is critical:
- External APIs (OpenF1) have strict rate limits (3 req/s free tier)
- If 1,000 users each polled OpenF1 directly = instant IP ban
- Instead: **1 backend worker polls → writes to Redis → WebSocket server broadcasts to all clients**
- Clients NEVER touch external APIs directly

**Redis Streams vs Pub/Sub:**
- **Redis Streams** for telemetry: Persistent, replayable, consumers can catch up if they disconnect
- **Redis Pub/Sub** for events: Fire-and-forget for race control messages, team radio notifications
- **Redis Key/Value** for state: Current standings, weather, session info (with TTL)

**PostgreSQL for permanence:**
- All historical data lives here
- Post-race archival job moves Redis data → PostgreSQL
- TimescaleDB extension for efficient time-series telemetry queries

---

## 4. Design System & Visual Language

### 4.1 Core Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Density over whitespace** | Zero unnecessary padding; maximize data per pixel; think Bloomberg Terminal meets F1 |
| **True black background** | `#000000` base — matches broadcast monitors, saves OLED power, reduces eye strain during long sessions |
| **Monospace for data** | All numbers, times, gaps use monospace font for perfect column alignment |
| **Motion with purpose** | Animate only position changes, overtakes, flag changes — never decorative animation |
| **Glanceable hierarchy** | Most important info (position, gap) largest; secondary info (tire age, pit count) smaller but always visible |
| **Color = meaning** | Every color conveys information; no decorative color |

### 4.2 Color Palette

#### Brand Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--f1-red` | `#E10600` | Primary brand, alerts, DRS active |
| `--f1-red-dark` | `#8B0000` | Hover states, secondary red |
| `--bg-primary` | `#000000` | Main background |
| `--bg-surface` | `#111111` | Card/panel backgrounds |
| `--bg-elevated` | `#1A1A1A` | Hover states, active panels |
| `--border` | `#2A2A2A` | Panel borders, dividers |
| `--text-primary` | `#FFFFFF` | Primary text |
| `--text-secondary` | `#888888` | Labels, descriptions |
| `--text-muted` | `#555555` | Disabled, inactive |

#### Sector Colors (F1 Standard)
| Token | Hex | Meaning |
|-------|-----|---------|
| `--sector-purple` | `#A020F0` | Overall best (any driver, entire session) |
| `--sector-green` | `#00FF00` | Personal best (that driver's best) |
| `--sector-yellow` | `#FFD700` | Slower than personal best |
| `--sector-red` | `#FF0000` | Significantly slower / invalid |

#### Tire Compound Colors (Pirelli Standard)
| Compound | Hex | Ring Color |
|----------|-----|------------|
| Soft | `#FF0000` | Red |
| Medium | `#FFD700` | Yellow |
| Hard | `#FFFFFF` | White |
| Intermediate | `#00CC00` | Green |
| Wet | `#0066FF` | Blue |

#### Track Status / Flag Colors
| Flag | Hex | Meaning |
|------|-----|---------|
| Green | `#00FF00` | Track clear |
| Yellow | `#FFD700` | Hazard (single/double) |
| Safety Car | `#FFA500` | Safety Car deployed |
| VSC | `#FFA500` + stripe | Virtual Safety Car |
| Red Flag | `#FF0000` | Session stopped |
| Blue Flag | `#0000FF` | Backmarker must yield |
| Black Flag | `#000000` + border | Disqualification |
| Chequered | checker pattern | Session end |

#### 2025 Team Colors (Update Annually)
| Team | Primary | Secondary |
|------|---------|-----------|
| Red Bull Racing | `#3671C6` | `#FFD700` |
| Mercedes | `#27F4D2` | `#000000` |
| Ferrari | `#E8002D` | `#FFEB3B` |
| McLaren | `#FF8000` | `#000000` |
| Aston Martin | `#229971` | `#FFFFFF` |
| Alpine | `#FF87BC` | `#0093CC` |
| Williams | `#64C4FF` | `#005AFF` |
| RB (VCARB) | `#6692FF` | `#FFFFFF` |
| Kick Sauber | `#52E252` | `#000000` |
| Haas | `#B6BABD` | `#E10600` |

> **Note:** Team colors MUST be loaded from database config, not hardcoded — they change every season and sometimes mid-season.

### 4.3 Typography

| Role | Font | Fallback | Weight | Usage |
|------|------|----------|--------|-------|
| **Display / Headlines** | Orbitron | system-ui | 700-900 | Page titles, driver names on map, large numbers |
| **UI / Labels** | Inter | -apple-system, sans-serif | 400-600 | Navigation, labels, descriptions, buttons |
| **Data / Numbers** | JetBrains Mono | SFMono-Regular, Consolas, monospace | 400-500 | All timing data, gaps, sector times, telemetry values, lap numbers |

> **F1 Official Font Note:** The F1 typeface (Formula1 Display, F1 Regular, F1 Bold, F1 Wide, F1 Turbo) is proprietary and requires licensing. Orbitron captures the same geometric, wide, futuristic motorsport aesthetic and is available free via Google Fonts.

### 4.4 Animation Standards

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Position change (overtake) | 300ms | ease-out | Standing order change |
| Sector time flash | 800ms | flash-then-fade | New sector time |
| Gap value update | 150ms | linear | New interval data |
| Car dot movement on map | Interpolated (lerp) | linear | Position data @3.7Hz → render @60fps |
| Panel expand/collapse | 200ms | ease-in-out | User click |
| Flag status change | Instant + 2s glow pulse | pulse | Track status change |
| New race control message | 400ms slide-in from right | ease-out | New RCM |

### 4.5 Iconography System
Custom SVG icon set needed for:
- Tire compounds (5 icons: circle with colored ring)
- Flags (8 types: colored rectangles with patterns)
- Session types: Practice (P), Qualifying (Q), Sprint (S), Race (R)
- Car status: Running, Pit, Out, DNF, DSQ
- Weather: Sun, Cloud, Rain, Heavy Rain, Wind direction arrow
- Penalties: Time penalty, Grid penalty, Drive-through, Stop-go, Warning, Black & white flag, Track limits
- DRS: Available, Active, Disabled zone indicator
- Safety Car: SC, VSC icons
- Pit lane: Entry, Exit, Speed limit

---

## 5. Feature Set: Live Race Console (Second Screen)

> This is the **PRIMARY view** — what 80% of users see 80% of the time. Every pixel matters.

### 5.1 Layout: The Four-Panel Console

```
┌──────────────────────────────────────────────────────────────────┐
│ [🏎️ PitWall] [F1 ▾] │ 🟢 GREEN │ LAP 44/57 │ 🌡️23°C │ 14:32:07 │
├──────────────┬───────────────────────────┬───────────────────────┤
│              │                           │                       │
│  TIMING      │     TRACK MAP             │  RACE CONTROL         │
│  TOWER       │     (Canvas/WebGL)        │  & COMMS FEED         │
│              │                           │                       │
│  20 drivers  │  20 colored dots moving   │  FIA Messages         │
│  with full   │  on circuit outline       │  Team Radio clips     │
│  timing data │                           │  Investigations       │
│              │  Click dot → driver focus  │  Penalties            │
│              │                           │                       │
│              │  [FULLSCREEN] button      │                       │
├──────────────┴───────────────────────────┴───────────────────────┤
│ BOTTOM BAR: DNF Ticker │ Speed Trap │ Weather │ Tire Summary      │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Component: Session Status Header Bar

**Always visible, fixed top, 40px height, true black background**

| Element | Data Source | Update Rate |
|---------|------------|-------------|
| App logo + Sport switcher | Static | — |
| Track Status indicator | `TrackStatus` topic / `race_control` endpoint | On event |
| Session type badge | `SessionInfo` | Session start |
| Lap counter (LAP X/Y) | `LapCount` topic | Per lap |
| Session clock | `ExtrapolatedClock` topic | 1 Hz |
| Air temperature | `weather` endpoint | 60s |
| Track temperature | `weather` endpoint | 60s |
| Rain indicator | `weather.rainfall` | 60s |
| Wind speed + direction arrow | `weather` endpoint | 60s |
| Humidity % | `weather` endpoint | 60s |
| DRS status (Enabled/Disabled) | `race_control` messages | On event |
| Safety Car status | `TrackStatus` topic | On event |
| [Fullscreen] [Pro Mode] toggles | UI state | User click |

### 5.3 Component: Timing Tower (Left Panel)

**The most critical data component — must be pixel-perfect**

#### Column Layout (configurable by user)

| Col | Header | Width | Content | Source |
|-----|--------|-------|---------|--------|
| 1 | POS | 30px | Position number + arrow (↑↓) showing places gained/lost from grid | `position`, `intervals` |
| 2 | — | 4px | Team color stripe (vertical bar) | `drivers.team_colour` |
| 3 | DRIVER | 50px | 3-letter code (VER, HAM, NOR...) | `drivers.broadcast_name` |
| 4 | GAP | 70px | Gap to leader (+1.234 or +1 LAP) | `intervals.gap_to_leader` |
| 5 | INT | 60px | Interval to car ahead (+0.567) | `intervals.interval` |
| 6 | LAST | 80px | Last lap time (colored: purple/green/yellow) | `laps.lap_duration` |
| 7 | S1 | 50px | Sector 1 time (colored) | `laps.duration_sector_1` |
| 8 | S2 | 50px | Sector 2 time (colored) | `laps.duration_sector_2` |
| 9 | S3 | 50px | Sector 3 time (colored) | `laps.duration_sector_3` |
| 10 | TIRE | 30px | Compound icon | `stints.compound` |
| 11 | AGE | 25px | Tire age in laps | Calculated from `stints.lap_start` |
| 12 | PIT | 20px | Number of pit stops | Count of `pit` events |
| 13 | ⚠️ | 20px | Penalty badge (if any) | `race_control` penalty messages |

#### Timing Tower Behaviors

- **Smooth reordering:** When positions change (overtake), rows animate to new positions over 300ms with easing — no jumpy re-renders
- **Pit lane indicator:** When a car is in pit lane, row background dims and "PIT" text replaces gap temporarily
- **Out lap indicator:** Strikethrough/dimmed lap time on out laps
- **DRS within 1s:** When interval < 1.000s, highlight the interval value in green with "DRS" micro-badge
- **Fastest lap:** Purple left border on the driver currently holding fastest lap of the race
- **Retirement:** Row grays out, moves to bottom of tower, status shows reason (e.g., "Power Unit", "Collision Damage")
- **Leader start/finish line crossing:** Brief flash on leader row each time they cross start/finish

#### Penalty System (Hover Cards)

When a penalty badge (⚠️) appears next to a driver:

**Hover/tap reveals a Shadcn HoverCard containing:**

```
┌─────────────────────────────────────────┐
│ 🔴 TIME PENALTY — 5 SECONDS            │
│                                         │
│ Driver: Max Verstappen (#1)             │
│ Lap: 34                                 │
│                                         │
│ Reason: Causing a collision             │
│ (Article 33.4 of the Sporting Regs)     │
│                                         │
│ Status: ⏳ NOT YET SERVED               │
│ Applied at next pit stop or added to    │
│ race time if not served.                │
│                                         │
│ 📖 What is a 5-second penalty?          │
│ A minor penalty where 5 seconds is      │
│ added to the driver's race time or      │
│ served during their next pit stop by    │
│ waiting stationary for 5 seconds.       │
└─────────────────────────────────────────┘
```

**Penalty types to support:**
| Penalty | Icon | Description |
|---------|------|-------------|
| 5-second time penalty | ⏱️5 | Added to race time or served at pit |
| 10-second time penalty | ⏱️10 | More severe version |
| 5-second stop-go | 🛑5 | Must pit + wait 5s + no work on car |
| 10-second stop-go | 🛑10 | More severe version |
| Drive-through penalty | 🔄 | Must drive through pit lane at pit speed |
| Grid place penalty | ⬇️5 | Applied to next race starting grid |
| Black & white flag | 🏴 | Warning for unsportsmanlike behavior |
| Track limits warning | ⚠️ | 3 warnings = lap time deleted (qualifying) |
| Disqualification | ❌ | Excluded from results |
| Reprimand | 📝 | Formal warning (3 = grid penalty) |

### 5.4 Component: Live Track Map (Center Panel — THE HERO)

**Technology Choice: PixiJS (WebGL) with Canvas fallback**

> **Why PixiJS over alternatives:**
> - SVG: Laggy with 20+ moving objects at 5Hz update rate
> - Raw Canvas: Works but no scene graph, tedious hit detection
> - React Three Fiber: Overkill for 2D, heavy bundle
> - Konva: Good for interactive shapes but slower than PixiJS for pure rendering
> - **PixiJS: WebGL-accelerated, handles 20 moving sprites at 60fps easily, ~45KB gzipped**

#### Track Map Features

**Base Layer — Circuit Outline:**
- Vector path of the circuit rendered as a thick line (~4px)
- Default color: `#333333` (dark gray)
- DRS zones highlighted in green dashed overlay
- Pit lane shown as a thinner parallel line
- Start/finish line marked with checkered pattern
- Corner numbers labeled at apex points
- Sector boundaries marked with subtle dotted lines (S1/S2/S3)

**Driver Layer — Moving Dots:**
- 20 circles (12px diameter) colored by team color
- Inside each dot: driver number in white text (8px font)
- Smooth interpolation (lerp) between position updates:
  - Data arrives at ~3.7 Hz (every ~270ms)
  - Render loop runs at 60fps
  - Each frame: `currentPos = lerp(lastPos, targetPos, t)` where t = elapsed/270ms
  - Result: silky smooth movement even with low-frequency data
- On hover: Show driver name + current speed tooltip
- On click: Enter "Driver Focus Mode" (see below)

**Dynamic Overlays:**
- **Yellow flag zones:** Track sections flash yellow where marshalls are waving
- **Safety Car line:** When SC deployed, show the SC position as a special icon
- **VSC indicator:** Entire track border pulses yellow
- **Red flag:** Track fills with translucent red overlay
- **Blue flag indicators:** Small blue arrows near cars being lapped
- **Pit entry/exit:** Animated dots entering/exiting pit lane
- **Crash/incident markers:** 💥 icon at incident location (from race control messages with sector info)

**Fullscreen Mode:**
- Button in top-right of map: expand to 100vh × 100vw
- All other panels collapse, timing tower overlays as a slim transparent column on left
- ESC or button to exit fullscreen
- Perfect for dedicated "map monitor" on a second display

**Driver Focus Mode (click a dot):**

```
┌─────────────────────────────────────────────┐
│ [Floating Modal — follows the dot]          │
│                                             │
│  #1 VER — Red Bull Racing                  │
│  ┌──────────────────────────┐               │
│  │ SPEED    │ 312 km/h      │               │
│  │ GEAR     │ 8             │               │
│  │ RPM      │ 11,450        │               │
│  │ THROTTLE │ ████████░░ 83%│               │
│  │ BRAKE    │ ░░░░░░░░░░  0%│               │
│  │ DRS      │ 🟢 ACTIVE     │               │
│  │ GAP      │ LEADER        │               │
│  │ TIRE     │ 🔴 Soft (12L) │               │
│  └──────────────────────────┘               │
│  [Close] [Compare with...]                  │
└─────────────────────────────────────────────┘
```

### 5.5 Component: Race Control & Communications Feed (Right Panel)

**Two tabs: "Race Control" and "Team Radio"**

#### Race Control Tab

Chronological feed of FIA messages, auto-scrolling to newest:

```
┌─────────────────────────────────────────┐
│ RACE CONTROL                    [🔔 On] │
│─────────────────────────────────────────│
│ LAP 47 • 14:52:03                       │
│ 🔴 PENALTY — Car 4 (NOR)               │
│ 5 second time penalty                   │
│ Causing a collision (Turn 4)            │
│─────────────────────────────────────────│
│ LAP 45 • 14:48:22                       │
│ 🟡 INVESTIGATION — Car 4 & Car 16      │
│ Incident between NOR and LEC            │
│ Turn 4 collision noted                  │
│─────────────────────────────────────────│
│ LAP 42 • 14:43:15                       │
│ 🔵 BLUE FLAG — Car 20 (MAG)            │
│ Blue flags shown                        │
│─────────────────────────────────────────│
│ LAP 38 • 14:36:44                       │
│ ⚫ TRACK LIMITS — Car 81 (PIA)          │
│ Track limits exceeded Turn 9            │
│ Warning 2 of 3                          │
│─────────────────────────────────────────│
│ LAP 31 • 14:27:11                       │
│ 🟢 GREEN FLAG                           │
│ Safety car in this lap                  │
│─────────────────────────────────────────│
│ LAP 28 • 14:22:55                       │
│ 🟡🟡 DOUBLE YELLOW — Sector 2          │
│ Incident at Turn 9                      │
│─────────────────────────────────────────│
│ LAP 28 • 14:22:41                       │
│ 🚨 SAFETY CAR DEPLOYED                  │
│ Incident involving Car 18 (STR)         │
│                                         │
│ [Load earlier messages...]              │
└─────────────────────────────────────────┘
```

**Message color coding:**
| Category | Background | Icon |
|----------|-----------|------|
| Flag (Green) | `rgba(0,255,0,0.1)` | 🟢 |
| Flag (Yellow/Double Yellow) | `rgba(255,215,0,0.1)` | 🟡 / 🟡🟡 |
| Flag (Red) | `rgba(255,0,0,0.15)` | 🔴 |
| Flag (Blue) | `rgba(0,0,255,0.1)` | 🔵 |
| Safety Car / VSC | `rgba(255,165,0,0.1)` | 🚨 |
| Investigation | `rgba(255,255,0,0.08)` | 🔍 |
| Penalty | `rgba(255,0,0,0.12)` | ⚖️ |
| Track Limits | `rgba(128,128,128,0.08)` | ⚫ |
| DRS Enabled/Disabled | `rgba(0,200,0,0.08)` | 📡 |
| Black & White Flag | `rgba(200,200,200,0.08)` | 🏴 |

#### Team Radio Tab

```
┌─────────────────────────────────────────┐
│ TEAM RADIO                     [🔊 On]  │
│─────────────────────────────────────────│
│ ┌──┐ LAP 44 • 14:48:12                 │
│ │🎧│ HAM → Mercedes                     │
│ └──┘ "These tires are completely gone,  │
│      I'm sliding everywhere"            │
│      [▶ Play Audio]                     │
│─────────────────────────────────────────│
│ ┌──┐ LAP 42 • 14:44:35                 │
│ │🎧│ PIT → VER                          │
│ └──┘ "Okay Max, so plan B, box this    │
│      lap, box this lap"                 │
│      [▶ Play Audio]                     │
│─────────────────────────────────────────│
│ ┌──┐ LAP 39 • 14:39:18                 │
│ │🎧│ NOR → McLaren                      │
│ └──┘ "Can you check my front wing?     │
│      Something doesn't feel right"      │
│      [▶ Play Audio]                     │
└─────────────────────────────────────────┘
```

- Each entry shows: Driver headshot thumbnail, driver code, team name, message text
- If `recording_url` is available from `team_radio` endpoint, show Play Audio button
- Audio plays inline (HTML5 Audio element)
- Filter dropdown: "All Teams" or select specific team
- Notification sound option: subtle chime when new radio message arrives

### 5.6 Component: Bottom Information Bar

**Fixed height (80-100px), horizontally scrollable on small screens**

#### Sub-components:

**1. DNF/Retirement Ticker**
```
💥 LAP 28: STR (#18) — Collision Damage │ 💥 LAP 12: BOT (#77) — Power Unit │ 💥 LAP 3: ALB (#23) — Hydraulics
```
- Scrolling marquee if many retirements
- Click any entry → modal with details (involved cars, lap, description)

**2. Speed Trap Leaderboard**
```
SPEED TRAP (Turn 13-14)
1. VER  341.2 km/h
2. SAI  339.8 km/h
3. NOR  338.1 km/h
```

**3. Tire Strategy Overview**
```
TIRE STRATEGY (Top 5)
VER: 🔴14 → 🟡22 → [current: 🟡 L8]
NOR: 🟡18 → 🔴12 → [current: 🔴 L14]
LEC: 🟡20 → 🟡 → [current: 🟡 L24] (1-stop!)
```

**4. Weather Station Widget**
```
🌤️ WEATHER
Air: 23°C  Track: 42°C
💨 12 km/h NW  💧 15%
Rain: 0% now → 35% in 30min
```

**5. Lap Time Distribution Sparkline**
- Tiny inline chart showing leader's last 10 lap times
- Visual indicator of pace consistency / tire degradation

---

## 6. Feature Set: Session Analysis (Practice, Qualifying, Sprint)

### 6.1 Practice Session View

| Feature | Description |
|---------|-------------|
| **Long Run Analysis** | Detect and display long runs (10+ consecutive laps on same tire). Show pace degradation curve |
| **Sector Comparison Matrix** | Table: Drivers × Sectors, colored by relative pace. Shows theoretical best lap |
| **Track Evolution** | Line chart of fastest lap time per 15-minute window. Shows track rubbering in |
| **Program Tracker** | Show what each team appears to be doing (race sim, qualifying sim, aero runs) |
| **Setup Changes** | Note when teams return to garage for extended periods (possible setup change) |

### 6.2 Qualifying View

| Feature | Description |
|---------|-------------|
| **Q1/Q2/Q3 Breakdown** | Tabbed view of each qualifying segment with times, gaps, sectors |
| **Knockout Zone** | Highlight drivers at risk of elimination in current segment |
| **Live Sector Comparison** | During Q: show real-time sector comparison against provisional pole |
| **Lap Validity** | Track limit violations → show which laps were deleted and why |
| **Theoretical Best Lap** | Combine best S1 + S2 + S3 from any driver's laps. Show how close pole is to theoretical maximum |
| **Qualifying Head-to-Head** | Teammate comparison: Gap in Q1, Q2, Q3. Running tally for season |
| **Pole Position History** | This circuit: Who held pole in previous years? Conversion rate to win? |

### 6.3 Sprint View

| Feature | Description |
|---------|-------------|
| **Sprint Shootout** | SQ1/SQ2/SQ3 qualifying breakdown |
| **Sprint Race** | Same as full race view but with 1/3 distance context |
| **Sprint Points Impact** | Show how sprint results affect championship standings |
| **Sprint vs Race Comparison** | After both events: Compare sprint result to race result for each driver |

---

## 7. Feature Set: Historical Database & Encyclopedia

### 7.1 Season Explorer

**Route: `/seasons` → `/seasons/[year]` → `/seasons/[year]/[round]`**

- Grid of all seasons (1950–present) as clickable cards
- Each card shows: Year, Champion driver + team, total races, dominant stats
- Season page: Calendar view of all races in that season with results summary
- Filter by: Decade, era (V10, V8, Turbo Hybrid), regulation period

### 7.2 Race Archive Page

**Route: `/seasons/[year]/[round]`**

| Section | Content |
|---------|---------|
| **Header** | Race name, circuit, date, weather conditions |
| **Final Classification** | Full result grid: Pos, Driver, Team, Grid, Laps, Time/Gap, Points, Status |
| **Grid vs Finish Visualizer** | Bump chart or slope graph showing each driver's journey from grid to finish |
| **Lap Chart** | Interactive chart: X = Lap, Y = Position, one line per driver. Hover for details |
| **Pit Stop Summary** | All pit stops: Lap, Duration, Tire change, Position before/after |
| **Penalty Log** | All penalties and investigations for this race |
| **Incident Log** | All incidents, retirements with causes |
| **Fastest Laps** | Fastest lap progression through the race |
| **Race Control Messages** | Full chronological log of all FIA messages |
| **Weather Timeline** | Temperature and rain data throughout the race |
| **Tire Strategy Diagram** | Horizontal bar chart: each driver's stints (colored by compound) from start to finish |

### 7.3 All-Time Records & Statistics

**Route: `/records`**

| Category | Records |
|----------|---------|
| **Championships** | Most driver titles, most constructor titles, youngest champion, oldest champion |
| **Wins** | Most wins (career, season, consecutive), most wins at single circuit, most wins from pole, most wins from P2+ |
| **Poles** | Most poles (career, season, consecutive), front row lockouts by team |
| **Podiums** | Most podiums, most consecutive podiums, podium finishes without a win |
| **Points** | Most points (career, season), most points finishes, highest points percentage |
| **Fastest Laps** | Most fastest laps (career, season), fastest lap on last lap, fastest lap from back of grid |
| **Starts** | Most race starts, most consecutive starts, most consecutive finishes |
| **DNFs** | Most DNFs (career, season), most mechanical DNFs, most collision DNFs |
| **Streaks** | Longest winning streak, longest points streak, longest podium streak, longest pole streak |
| **Close Finishes** | Closest race finish ever, closest championship battle, most lead changes in a race |
| **First/Last** | Youngest winner, oldest winner, youngest pole sitter, first win for each nationality |
| **Laps** | Most laps led (career, season, single race), most laps completed |
| **Qualifying** | Biggest qualifying gap, closest qualifying (top 3 within 0.1s) |

### 7.4 "On This Day" Feature

- Homepage widget: "On this day in F1 history..."
- Show notable events from previous years on today's date
- Clickable → leads to the relevant race archive page

### 7.5 Full-Text Search

**Route: `/search`**

- Search across: Drivers, Teams, Circuits, Races, Seasons
- Autocomplete with category badges (🏁 Race, 👤 Driver, 🏗️ Team, 🏟️ Circuit)
- Search examples:
  - "Verstappen 2023" → Driver profile + 2023 season stats
  - "Monaco rain" → All Monaco GPs with wet conditions
  - "Red flag" → All races with red flags
  - "Engine failure 2022" → All mechanical DNFs in 2022

---

## 8. Feature Set: Driver & Constructor Profiles

### 8.1 Driver Profile Page

**Route: `/drivers/[driverId]`**

#### Header Card
- Large headshot photo
- Full name, nationality flag, permanent number
- Current team + team color
- Age, date of birth
- Career span (debut year – present/retirement year)

#### Career Statistics Dashboard

| Stat | Value | Trend |
|------|-------|-------|
| World Championships | Count | Trophy icons |
| Race Wins | Count + Win % | Sparkline over career |
| Podiums | Count + Podium % | Sparkline |
| Pole Positions | Count | Sparkline |
| Fastest Laps | Count | — |
| Career Points | Total | — |
| Race Starts | Count | — |
| Best Championship Finish | Position | — |
| Average Qualifying Position | Value | Per-season chart |
| Average Finishing Position | Value | Per-season chart |
| DNF Rate | Percentage | Per-season chart |
| Points Per Race Average | Value | Per-season chart |

#### Season-by-Season Breakdown Table

| Year | Team | Races | Wins | Pods | Poles | FL | Pts | Pos | Teammate | H2H Qual | H2H Race |
|------|------|-------|------|------|-------|----|-----|-----|----------|----------|----------|
| 2024 | Red Bull | 24 | 9 | 14 | 12 | 3 | 412 | 1st | PER | 22-2 | 20-3 |
| 2023 | Red Bull | 22 | 19 | 21 | 12 | 6 | 575 | 1st | PER | 21-1 | 19-2 |

#### Performance Trajectory Charts

1. **Championship Position by Season** — Line chart
2. **Points Scored by Season** — Bar chart
3. **Average Finishing Position by Season** — Line chart (lower = better)
4. **Qualifying vs Race Position Delta** — Shows if driver gains or loses places on average
5. **Wet vs Dry Performance** — Comparison radar chart
6. **Circuit Performance Heatmap** — Grid: Circuits × Years, colored by finish position

#### Teammate Head-to-Head

- Dropdown to select season and teammate
- Table: Qualifying pace difference (median gap in seconds)
- Race finishes ahead count
- Points comparison
- DNFs excluded from comparison (toggle)

### 8.2 Constructor Profile Page

**Route: `/constructors/[constructorId]`**

#### Statistics
- World Constructor Championships
- Race wins, podiums, poles, fastest laps
- Points (career + per season)
- Number of seasons in F1
- Reliability rate (% of races both cars finished)
- Average pit stop time (current season)

#### Team Timeline
- Historical timeline of the team: name changes, ownership, engine suppliers
- Example: Toleman → Benetton → Renault → Lotus → Renault → Alpine

#### Driver Roster History
- Table of all drivers who raced for this team, by season
- Include: wins with team, podiums, championships won while at team

#### Car Development Tracker (Current Season)
- Race-by-race performance chart showing team's pace relative to fastest team
- Shows upgrade impact: marker on chart when major upgrades are introduced

---

## 9. Feature Set: Commentator & Analyst Pro Tools

> **Accessible via a "Pro Mode" toggle in the header — adds overlay panels on top of the live console**

### 9.1 Pit Window Calculator

**What it does:** Projects where a driver will emerge in the race if they pit on the current lap.

**Inputs (auto-populated from live data):**
- Current gap to cars ahead/behind
- Average pit lane time loss for this circuit (from historical data)
- Current in/out lap delta (historically how much slower are pit in/out laps)
- Tire warmup penalty (first 1-2 laps on new tires)

**Output:**
```
┌─────────────────────────────────────────────┐
│ PIT WINDOW — VER (P1)                       │
│                                             │
│ If pitting THIS lap:                        │
│ • Exits pit lane behind: NOR (P2) by 2.3s   │
│ • Exits pit lane ahead of: LEC (P3) by 4.1s │
│                                             │
│ Optimal pit window: Laps 32-36              │
│ (To maintain position over NOR)             │
│                                             │
│ Undercut threat from NOR: LAP 30-33         │
│ Overcut window for VER: LAP 34-38           │
└─────────────────────────────────────────────┘
```

### 9.2 Pace Delta Chart (Battle Tracker)

- Select 2 drivers to compare
- Line chart: X = Lap number, Y = Cumulative time delta
- Positive = Driver A is ahead and extending
- Negative = Driver B is catching
- Slope of line = rate of closure (tenths per lap)
- Hover any lap → tooltip with both lap times
- Overlaid markers for pit stops (both drivers)

### 9.3 Tire Degradation Curves

- Per-driver line chart: X = Stint lap count, Y = Lap time
- Separate lines per compound (colored accordingly)
- Shows pace drop-off as tires age
- Useful for predicting when a driver's tires will "fall off a cliff"
- Compare degradation between teammates (setup difference indicator)

### 9.4 Race Pace Table (Analyst View)

| Driver | Stint 1 (Med) | Avg Pace | Stint 2 (Hard) | Avg Pace | Stint 3 (Soft) | Avg Pace | Overall Avg |
|--------|--------------|----------|----------------|----------|----------------|----------|-------------|
| VER | L1-18 | 1:32.456 | L19-40 | 1:33.012 | L41-57 | 1:32.789 | 1:32.752 |
| NOR | L1-15 | 1:32.612 | L16-38 | 1:33.134 | L39-57 | 1:32.501 | 1:32.749 |

- Exclude pit in/out laps, SC laps, first lap
- Adjustable filters: Include/exclude laps behind traffic, SC, VSC

### 9.5 Instant Stat Lookup (Command Palette)

**Keyboard shortcut: `Cmd+K` / `Ctrl+K` → Opens command palette**

Quick queries a commentator might need:
- "Last 5 winners at Silverstone"
- "VER vs HAM head to head 2021"
- "Fastest pit stop today"
- "Who has the most penalties this season"
- "Rain races this season"
- "Youngest driver on grid"
- "NOR's qualifying record at this circuit"

### 9.6 Championship Scenario Calculator

- "What if" mode for championship standings
- Input hypothetical results for remaining races
- Show resulting championship order
- "Can X still win the championship?" — mathematically possible or eliminated

### 9.7 Sector Time Comparison Tool

- Select 2+ drivers
- Bar chart comparing their best sector times
- Show where time is gained/lost on the circuit
- Color-coded: Green = advantage, Red = disadvantage
- Link sector advantage to specific corners (if corner data available)

### 9.8 Overtake Probability Zones

- Based on historical data for each circuit
- Highlight track sections where overtakes most commonly happen
- Show DRS effectiveness stats for this circuit
- "This circuit averages X overtakes per race" from historical data

---

## 10. Feature Set: Circuit Encyclopedia

### 10.1 Circuit Profile Page

**Route: `/circuits/[circuitId]`**

| Section | Content |
|---------|---------|
| **Header** | Circuit name, location, country flag, GPS coordinates |
| **Track Map** | SVG circuit layout with corner numbers, DRS zones, pit lane, sector boundaries |
| **Key Stats** | Length (km), Turns, Lap record (time + driver + year), Top speed record, Race distance |
| **Corner Guide** | Numbered list of all corners: Name (if named), type (hairpin/chicane/flat-out), gear, speed range |
| **DRS Zones** | List of DRS detection points and activation zones with map overlay |
| **Elevation Profile** | Chart showing elevation changes around the lap |
| **Race History** | Table of all races held at this circuit: Year, Winner, Pole, Fastest Lap, Weather |
| **Circuit Records** | Fastest qualifying lap (all time), fastest race lap, most wins at this circuit |
| **Overtaking Stats** | Average overtakes per race, most common overtaking spots |
| **Weather History** | Average conditions for race weekend (temp, rain probability) based on historical data |
| **Tire Allocation** | What compounds Pirelli typically brings to this circuit and typical strategy |
| **Lap Time Evolution** | Chart showing pole position time evolution by year (shows effect of regulation changes) |

### 10.2 Circuit Comparison Tool

- Compare 2 circuits side-by-side
- Metrics: Length, turns, top speed, typical strategy, overtaking rate, safety car probability

---

## 11. Feature Set: Multi-Sport Shell & Navigation

### 11.1 App Shell Architecture

The entire app is wrapped in a **Sport Shell** that enables future expansion:

```
┌──────────────────────────────────────────┐
│ [🏎️ PitWall Logo]  [F1 ▾]  [...]        │
│                     └── Sport Switcher    │
│                         ├─ 🏎️ Formula 1 (Active)
│                         ├─ 🏍️ MotoGP (Coming Soon)
│                         ├─ 🏎️ WEC (Coming Soon)
│                         ├─ 🏎️ IndyCar (Coming Soon)
│                         └─ ⚽ Football (Coming Soon)
├──────────────────────────────────────────┤
│                                          │
│    [Sport-Specific Content Area]         │
│                                          │
└──────────────────────────────────────────┘
```

### 11.2 Sport-Agnostic Design Patterns

To ensure future sports can be added efficiently:

| Pattern | Implementation |
|---------|---------------|
| **Dynamic theming** | Each sport has its own color palette loaded from config. F1 = Red/Black, MotoGP = TBD, etc. |
| **Shared components** | Timing tower component is a generic "ranked list with live data" — reusable across sports |
| **Plugin architecture** | Each sport is a "plugin" with its own routes, components, data sources, and store |
| **Shared infrastructure** | Redis, PostgreSQL, WebSocket server, worker pattern — all reusable |
| **Sport config schema** | Database table: `sports(id, name, icon, color_primary, color_secondary, is_active)` |

### 11.3 Navigation Architecture

```
/ ................................. Landing / Dashboard (upcoming sessions across all sports)
/f1 .............................. F1 Home (next race countdown, live session if available)
/f1/live ......................... Live Race Console (the main second-screen view)
/f1/live/fullscreen .............. Fullscreen track map only
/f1/seasons ...................... Season archive browser
/f1/seasons/[year] ............... Season overview
/f1/seasons/[year]/[round] ....... Race archive page
/f1/drivers ...................... All drivers (current + historical)
/f1/drivers/[id] ................. Driver profile
/f1/constructors ................. All teams
/f1/constructors/[id] ............ Team profile
/f1/circuits ..................... All circuits
/f1/circuits/[id] ................ Circuit profile
/f1/records ...................... All-time records
/f1/compare ...................... Telemetry comparison tool
/f1/compare/[sessionId] .......... Compare specific session laps
/f1/calendar ..................... Current season calendar
/f1/standings .................... Current championship standings
/f1/standings/[year] ............. Historical standings
/f1/search ....................... Full-text search
/settings ........................ App settings (theme, density, notifications, audio)
```

---

## 12. Database Schema (PostgreSQL)

### 12.1 Core Tables

```sql
-- ============================================
-- MULTI-SPORT SHELL
-- ============================================

CREATE TABLE sports (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(20) UNIQUE NOT NULL,  -- 'f1', 'motogp', etc.
  name          VARCHAR(100) NOT NULL,
  icon          VARCHAR(10),                   -- emoji
  color_primary VARCHAR(7),                    -- hex
  is_active     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: REFERENCE ENTITIES
-- ============================================

CREATE TABLE f1_circuits (
  id              SERIAL PRIMARY KEY,
  circuit_ref     VARCHAR(50) UNIQUE NOT NULL,  -- 'silverstone', 'monza'
  name            VARCHAR(200) NOT NULL,
  locality        VARCHAR(100),
  country         VARCHAR(100) NOT NULL,
  country_code    VARCHAR(3),
  latitude        DECIMAL(10,6),
  longitude       DECIMAL(10,6),
  altitude        INTEGER,                      -- meters
  length_meters   INTEGER,
  turns           INTEGER,
  map_svg_path    TEXT,                         -- SVG path data for track outline
  map_rotation    DECIMAL(5,2),                -- degrees to rotate SVG to match broadcast view
  pit_loss_time   DECIMAL(5,2),               -- typical pit lane time loss in seconds
  drs_zones       JSONB,                       -- [{detection_m, activation_m, end_m}, ...]
  corner_data     JSONB,                       -- [{number, name, type, gear}, ...]
  elevation_data  JSONB,                       -- [{distance_m, elevation_m}, ...]
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE f1_drivers (
  id              SERIAL PRIMARY KEY,
  driver_ref      VARCHAR(50) UNIQUE NOT NULL,  -- 'max_verstappen'
  broadcast_name  VARCHAR(3) NOT NULL,          -- 'VER'
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  full_name       VARCHAR(200) NOT NULL,
  permanent_number INTEGER,
  date_of_birth   DATE,
  nationality     VARCHAR(100),
  country_code    VARCHAR(3),
  headshot_url    VARCHAR(500),
  helmet_url      VARCHAR(500),
  biography       TEXT,
  is_active       BOOLEAN DEFAULT true,
  debut_year      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE f1_constructors (
  id                SERIAL PRIMARY KEY,
  constructor_ref   VARCHAR(50) UNIQUE NOT NULL,  -- 'red_bull'
  name              VARCHAR(200) NOT NULL,
  full_name         VARCHAR(300),                 -- 'Oracle Red Bull Racing'
  nationality       VARCHAR(100),
  color_primary     VARCHAR(7) NOT NULL,           -- '#3671C6'
  color_secondary   VARCHAR(7),
  logo_url          VARCHAR(500),
  car_image_url     VARCHAR(500),
  base_location     VARCHAR(200),
  team_principal    VARCHAR(200),
  engine_supplier   VARCHAR(100),
  chassis_name      VARCHAR(50),                   -- 'RB20'
  first_season      INTEGER,
  is_active         BOOLEAN DEFAULT true,
  predecessor_id    INTEGER REFERENCES f1_constructors(id),  -- for team lineage
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: SEASON & EVENT STRUCTURE
-- ============================================

CREATE TABLE f1_seasons (
  year            INTEGER PRIMARY KEY,
  champion_driver_id    INTEGER REFERENCES f1_drivers(id),
  champion_constructor_id INTEGER REFERENCES f1_constructors(id),
  total_races     INTEGER,
  regulation_era  VARCHAR(50),  -- 'V10', 'V8', 'Turbo Hybrid', 'Ground Effect'
  notes           TEXT
);

CREATE TABLE f1_races (
  id              SERIAL PRIMARY KEY,
  season_year     INTEGER NOT NULL REFERENCES f1_seasons(year),
  round           INTEGER NOT NULL,
  circuit_id      INTEGER NOT NULL REFERENCES f1_circuits(id),
  race_name       VARCHAR(200) NOT NULL,
  race_date       DATE,
  race_time       TIME,
  race_timezone   VARCHAR(50),
  total_laps      INTEGER,
  race_distance_km DECIMAL(6,2),
  has_sprint      BOOLEAN DEFAULT false,
  weather_summary JSONB,
  openf1_meeting_key INTEGER,
  openf1_session_key INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_year, round)
);

CREATE TABLE f1_sessions (
  id              SERIAL PRIMARY KEY,
  race_id         INTEGER NOT NULL REFERENCES f1_races(id),
  session_type    VARCHAR(20) NOT NULL,        -- 'FP1','FP2','FP3','Q','SQ','S','R'
  session_name    VARCHAR(100),
  date_start      TIMESTAMPTZ,
  date_end        TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'scheduled',
  openf1_session_key INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: RACE ENTRIES & RESULTS
-- ============================================

CREATE TABLE f1_race_entries (
  id              SERIAL PRIMARY KEY,
  race_id         INTEGER NOT NULL REFERENCES f1_races(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  constructor_id  INTEGER NOT NULL REFERENCES f1_constructors(id),
  car_number      INTEGER NOT NULL,
  UNIQUE(race_id, driver_id)
);

CREATE TABLE f1_results (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  constructor_id  INTEGER NOT NULL REFERENCES f1_constructors(id),
  grid_position   INTEGER,
  finish_position INTEGER,
  position_text   VARCHAR(10),
  classification  VARCHAR(20),                 -- 'Finished', 'DNF', 'DSQ', 'DNS'
  status          VARCHAR(100),                -- 'Finished', '+1 Lap', 'Engine', 'Collision'
  points          DECIMAL(5,2) DEFAULT 0,
  laps_completed  INTEGER,
  total_time_ms   BIGINT,
  gap_to_leader   VARCHAR(50),
  fastest_lap     BOOLEAN DEFAULT false,
  fastest_lap_time_ms INTEGER,
  fastest_lap_number INTEGER,
  avg_speed_kmh   DECIMAL(6,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, driver_id)
);

-- ============================================
-- F1: QUALIFYING RESULTS
-- ============================================

CREATE TABLE f1_qualifying_results (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  constructor_id  INTEGER NOT NULL REFERENCES f1_constructors(id),
  position        INTEGER,
  q1_time_ms      INTEGER,
  q2_time_ms      INTEGER,
  q3_time_ms      INTEGER,
  q1_laps         INTEGER,
  q2_laps         INTEGER,
  q3_laps         INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, driver_id)
);

-- ============================================
-- F1: LAP-BY-LAP DATA
-- ============================================

CREATE TABLE f1_laps (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  lap_number      INTEGER NOT NULL,
  position        INTEGER,
  lap_time_ms     INTEGER,
  sector_1_ms     INTEGER,
  sector_2_ms     INTEGER,
  sector_3_ms     INTEGER,
  sector_1_segments JSONB,                    -- mini-sector color codes
  sector_2_segments JSONB,
  sector_3_segments JSONB,
  speed_trap_kmh  DECIMAL(5,1),
  is_pit_in_lap   BOOLEAN DEFAULT false,
  is_pit_out_lap  BOOLEAN DEFAULT false,
  is_personal_best BOOLEAN DEFAULT false,
  is_overall_best BOOLEAN DEFAULT false,
  compound        VARCHAR(20),
  tyre_age        INTEGER,
  track_status    VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, driver_id, lap_number)
);

CREATE INDEX idx_laps_session_driver ON f1_laps(session_id, driver_id);
CREATE INDEX idx_laps_session_lap ON f1_laps(session_id, lap_number);

-- ============================================
-- F1: PIT STOPS
-- ============================================

CREATE TABLE f1_pit_stops (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  stop_number     INTEGER NOT NULL,
  lap_number      INTEGER NOT NULL,
  pit_duration_ms INTEGER,
  total_time_ms   INTEGER,
  compound_from   VARCHAR(20),
  compound_to     VARCHAR(20),
  position_before INTEGER,
  position_after  INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: STINTS
-- ============================================

CREATE TABLE f1_stints (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  stint_number    INTEGER NOT NULL,
  compound        VARCHAR(20) NOT NULL,
  lap_start       INTEGER NOT NULL,
  lap_end         INTEGER,
  tyre_age_start  INTEGER DEFAULT 0,
  total_laps      INTEGER,
  avg_lap_time_ms INTEGER,
  degradation_per_lap_ms INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: PENALTIES & INCIDENTS
-- ============================================

CREATE TABLE f1_penalties (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  lap_number      INTEGER,
  penalty_type    VARCHAR(50) NOT NULL,
  time_added_sec  INTEGER,
  grid_places     INTEGER,
  reason          TEXT NOT NULL,
  regulation_ref  VARCHAR(100),
  is_served       BOOLEAN DEFAULT false,
  served_lap      INTEGER,
  issued_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE f1_incidents (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  lap_number      INTEGER,
  description     TEXT NOT NULL,
  incident_type   VARCHAR(50),
  sector          INTEGER,
  turn_number     INTEGER,
  drivers_involved JSONB,
  safety_car      BOOLEAN DEFAULT false,
  red_flag        BOOLEAN DEFAULT false,
  occurred_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: RACE CONTROL MESSAGES (ARCHIVE)
-- ============================================

CREATE TABLE f1_race_control_messages (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  lap_number      INTEGER,
  category        VARCHAR(50),
  flag            VARCHAR(30),
  scope           VARCHAR(20),
  sector          INTEGER,
  driver_number   INTEGER,
  message         TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: TEAM RADIO (ARCHIVE)
-- ============================================

CREATE TABLE f1_team_radio (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  lap_number      INTEGER,
  recording_url   VARCHAR(500),
  transcription   TEXT,
  direction       VARCHAR(10),
  occurred_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- F1: WEATHER DATA (PER SESSION)
-- ============================================

CREATE TABLE f1_weather_snapshots (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  air_temperature DECIMAL(4,1),
  track_temperature DECIMAL(4,1),
  humidity        DECIMAL(4,1),
  pressure        DECIMAL(6,1),
  wind_speed      DECIMAL(5,1),
  wind_direction  INTEGER,
  rainfall        BOOLEAN DEFAULT false,
  recorded_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weather_session_time ON f1_weather_snapshots(session_id, recorded_at);

-- ============================================
-- F1: CHAMPIONSHIP STANDINGS (SNAPSHOTS)
-- ============================================

CREATE TABLE f1_driver_standings (
  id              SERIAL PRIMARY KEY,
  season_year     INTEGER NOT NULL REFERENCES f1_seasons(year),
  round           INTEGER NOT NULL,
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  position        INTEGER NOT NULL,
  points          DECIMAL(6,2) NOT NULL,
  wins            INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_year, round, driver_id)
);

CREATE TABLE f1_constructor_standings (
  id              SERIAL PRIMARY KEY,
  season_year     INTEGER NOT NULL REFERENCES f1_seasons(year),
  round           INTEGER NOT NULL,
  constructor_id  INTEGER NOT NULL REFERENCES f1_constructors(id),
  position        INTEGER NOT NULL,
  points          DECIMAL(6,2) NOT NULL,
  wins            INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_year, round, constructor_id)
);

-- ============================================
-- F1: TELEMETRY SNAPSHOTS (POST-SESSION ARCHIVE)
-- Consider TimescaleDB hypertable for time-series optimization
-- ============================================

CREATE TABLE f1_telemetry (
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  lap_number      INTEGER NOT NULL,
  distance_m      DECIMAL(8,1) NOT NULL,
  timestamp_ms    BIGINT NOT NULL,
  speed           DECIMAL(5,1),
  rpm             INTEGER,
  gear            SMALLINT,
  throttle        DECIMAL(4,1),
  brake           BOOLEAN,
  drs             SMALLINT,
  x               DECIMAL(10,1),
  y               DECIMAL(10,1),
  z               DECIMAL(10,1),
  PRIMARY KEY (session_id, driver_id, lap_number, distance_m)
);

-- ============================================
-- F1: SPEED TRAP DATA
-- ============================================

CREATE TABLE f1_speed_traps (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES f1_sessions(id),
  driver_id       INTEGER NOT NULL REFERENCES f1_drivers(id),
  lap_number      INTEGER NOT NULL,
  speed_kmh       DECIMAL(5,1) NOT NULL,
  trap_name       VARCHAR(50),
  is_personal_best BOOLEAN DEFAULT false,
  is_overall_best  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.2 Key Indexes

```sql
CREATE INDEX idx_results_driver ON f1_results(driver_id);
CREATE INDEX idx_results_constructor ON f1_results(constructor_id);
CREATE INDEX idx_results_session ON f1_results(session_id);
CREATE INDEX idx_races_season ON f1_races(season_year);
CREATE INDEX idx_races_circuit ON f1_races(circuit_id);
CREATE INDEX idx_penalties_driver ON f1_penalties(driver_id);
CREATE INDEX idx_penalties_session ON f1_penalties(session_id);
CREATE INDEX idx_standings_driver ON f1_driver_standings(season_year, driver_id);
CREATE INDEX idx_standings_constructor ON f1_constructor_standings(season_year, constructor_id);
CREATE INDEX idx_stints_session_driver ON f1_stints(session_id, driver_id);
CREATE INDEX idx_pitstops_session ON f1_pit_stops(session_id);
CREATE INDEX idx_rcm_session ON f1_race_control_messages(session_id);
CREATE INDEX idx_telemetry_session_driver_lap ON f1_telemetry(session_id, driver_id, lap_number);
```

---

## 13. Redis Schema (Live State & Streams)

### 13.1 Key/Value Store (Current State)

```
# Session metadata
live:session:info              → JSON { session_key, session_type, meeting_key, status, total_laps }
live:session:clock             → JSON { remaining, extrapolating, utc }

# Track status
live:track:status              → JSON { status: "Green"|"Yellow"|"SC"|"VSC"|"Red", message }

# Current standings (sorted array)
live:standings                 → JSON [ { driver_number, position, gap_to_leader, interval, ... } ]

# Per-driver current state
live:driver:{number}:state     → JSON { position, gap, interval, speed, gear, compound, tyre_age, pits, penalties, drs }

# Weather
live:weather                   → JSON { air_temp, track_temp, humidity, pressure, wind_speed, wind_direction, rainfall }

# DRS status
live:drs                       → JSON { enabled: true/false, message }

# Lap count
live:lap                       → JSON { current: 44, total: 57 }

# DNF list
live:dnf                       → JSON [ { driver_number, lap, reason } ]

# Speed trap top 3
live:speed_trap                → JSON [ { driver_number, speed } ]
```

**TTL Strategy:**
- `live:*` keys: 10-minute TTL (auto-expire if ingestion dies)
- Ingestion worker refreshes TTL on every write
- If TTL expires → frontend shows "STALE DATA" warning

### 13.2 Redis Streams (Time-Series Events)

```
# High-frequency telemetry per car
stream:telemetry:car:{number}  → { speed, rpm, gear, throttle, brake, drs, x, y, z, timestamp }
  → MAXLEN ~5000 (keep last ~22 minutes at 3.7Hz)

# Position updates for all cars (for track map)
stream:positions               → { positions: [{number, x, y, z}, ...], timestamp }
  → MAXLEN ~2000

# Intervals/gaps updates
stream:intervals               → { intervals: [{number, gap, interval}, ...], timestamp }
  → MAXLEN ~2000
```

### 13.3 Redis Pub/Sub (One-Shot Events)

```
# Race control messages
channel:race_control           → { lap, category, flag, message, driver_number, timestamp }

# Team radio notifications
channel:team_radio             → { driver_number, recording_url, timestamp }

# Pit events
channel:pit                    → { driver_number, lap, duration_ms, compound_from, compound_to }

# Position changes (overtakes)
channel:overtake               → { overtaker, overtaken, lap, turn }

# Track status changes
channel:track_status           → { status, message }
```

---

## 14. Real-Time Data Pipeline

### 14.1 Ingestion Worker Architecture

```
┌──────────────────────────────────────────────────┐
│              INGESTION WORKER (Node.js)            │
│                                                    │
│  ┌───────────────────────────────────────────┐    │
│  │         Session Manager                    │    │
│  │  • Polls /sessions to detect active session│    │
│  │  • Starts/stops data collection            │    │
│  │  • Handles session transitions (FP→Q→R)   │    │
│  └───────────────┬───────────────────────────┘    │
│                  │                                 │
│     ┌────────────┴──────────────┐                  │
│     ▼                          ▼                   │
│  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ REST Poller  │  │ SignalR Client            │   │
│  │              │  │ (if F1 TV auth available) │   │
│  │ Poll OpenF1: │  │                          │   │
│  │ • /car_data  │  │ Subscribe to all topics  │   │
│  │ • /location  │  │ Decompress .z payloads   │   │
│  │ • /intervals │  │                          │   │
│  │ • /laps      │  │                          │   │
│  │ • /pit       │  │                          │   │
│  │ • /stints    │  │                          │   │
│  │ • /weather   │  │                          │   │
│  │ • /race_ctrl │  │                          │   │
│  └──────┬───────┘  └──────────┬───────────────┘   │
│         │                     │                    │
│         ▼                     ▼                    │
│  ┌─────────────────────────────────────────────┐  │
│  │           Data Normalizer / Parser           │  │
│  │  • Decompresses .z payloads                  │  │
│  │  • Maps external schema → internal schema    │  │
│  │  • Deduplicates (skip unchanged data)        │  │
│  │  • Validates data integrity                  │  │
│  └───────────────────┬─────────────────────────┘  │
│                      │                             │
│                      ▼                             │
│  ┌─────────────────────────────────────────────┐  │
│  │           Redis Writer                       │  │
│  │  • SET live:* keys (current state)           │  │
│  │  • XADD stream:* (telemetry streams)         │  │
│  │  • PUBLISH channel:* (events)                │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 14.2 Polling Strategy (OpenF1 REST)

| Endpoint | Poll Interval | Priority | Notes |
|----------|--------------|----------|-------|
| `/car_data` | 300ms (3.3Hz) | Critical | Highest frequency, most data |
| `/location` | 300ms (3.3Hz) | Critical | For track map rendering |
| `/intervals` | 500ms (2Hz) | High | Standings and gaps |
| `/laps` | 1000ms (1Hz) | High | New lap completions |
| `/race_control` | 1000ms (1Hz) | High | Penalties, flags |
| `/stints` | 2000ms (0.5Hz) | Medium | Tire changes |
| `/pit` | 2000ms (0.5Hz) | Medium | Pit events |
| `/team_radio` | 3000ms (0.33Hz) | Medium | Radio clips |
| `/weather` | 10000ms (0.1Hz) | Low | Slow-changing |
| `/position` | 500ms (2Hz) | High | Track position order |

**Total request budget:** ~12-15 req/s → Need OpenF1 supporter tier (6 req/s) or multiple API keys with round-robin

**Backoff Strategy:**
1. On HTTP 429: Exponential backoff starting at 1s, max 30s
2. On network error: Retry 3x with 1s delay, then mark source as degraded
3. On source degraded: Switch to lower-frequency polling, show ⚠️ in UI

### 14.3 WebSocket Broadcasting

```
Socket.io Room Structure:

Room: "live:race" — ALL clients join by default
  Broadcasts @2Hz: { standings, lap, trackStatus, weather, dnf }

Room: "live:map" — Clients viewing the track map
  Broadcasts @5Hz: { positions: [{number, x, y, z}, ...] }

Room: "live:telemetry:car:{N}" — Clients focused on specific car
  Broadcasts @5Hz: { speed, rpm, gear, throttle, brake, drs }

Room: "live:events" — All clients
  Broadcasts on-event: race_control messages, team_radio, pit events
```

**Optimization:**
- Batched updates: Collect all position changes in 200ms window, send as single message
- Compression: Socket.io perMessageDeflate for WebSocket compression
- Binary protocol option: MessagePack instead of JSON for high-frequency data

### 14.4 Post-Session Archival

After a session ends:

1. **BullMQ Job: `archive:session`**
   - Read all Redis stream data
   - Transform to PostgreSQL schema
   - Batch INSERT into `f1_laps`, `f1_results`, `f1_telemetry`, etc.
   - Calculate derived stats (avg pace, degradation curves)
   - Clear Redis live keys

2. **BullMQ Job: `enrich:session`** (runs after archive)
   - Use FastF1 Python library to fetch enhanced telemetry
   - Fill in any gaps in the data
   - Update `f1_telemetry` table with enriched data

---

## 15. Frontend Architecture

### 15.1 Technology Choices

| Category | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Next.js 15+ (App Router) | SSR for historical pages (SEO), CSR for live console |
| **Styling** | Tailwind CSS + Shadcn UI | Rapid development, consistent design tokens, customizable |
| **Live State** | Zustand | Bypasses React context rendering bottleneck for 5Hz updates |
| **Server State** | TanStack Query (React Query) | Caching, deduplication, background refresh for historical data |
| **Track Map** | PixiJS (WebGL) | 60fps rendering of 20+ moving objects; ~45KB bundle |
| **Charts** | Lightweight Charts (TradingView) + Recharts | LW Charts for real-time streaming; Recharts for static analysis |
| **WebSocket Client** | Socket.io Client | Room-based subscriptions, auto-reconnect |
| **Icons** | Lucide React | Tree-shakeable, consistent with Shadcn |
| **Fonts** | Google Fonts (Orbitron, Inter, JetBrains Mono) | Free, performant via `next/font` |
| **Audio** | Howler.js | For team radio playback and notification sounds |

### 15.2 Zustand Store Architecture

```
stores/
├── useSessionStore.ts        # Current session info, status, lap count
├── useStandingsStore.ts      # Live driver standings (20 entries, sorted)
├── usePositionsStore.ts      # All car X/Y/Z for map (20 entries × 3 coords)
├── useTelemetryStore.ts      # Per-car telemetry (subscribed car only)
├── useWeatherStore.ts        # Current weather data
├── useRaceControlStore.ts    # Race control message queue (last 50)
├── useTeamRadioStore.ts      # Team radio message queue (last 20)
├── useTrackStatusStore.ts    # Green/Yellow/SC/VSC/Red
├── usePenaltyStore.ts        # Active penalties per driver
├── useDnfStore.ts            # Retired cars list
├── useSpeedTrapStore.ts      # Speed trap leaderboard
└── useUIStore.ts             # UI state (selected driver, fullscreen, pro mode)
```

**Critical Performance Rule:**
- Each store updates independently → only components subscribed to that store re-render
- Use Zustand `shallow` comparison for array stores (standings, positions)
- Track map reads from `usePositionsStore` via `getState()` in animation loop — NOT via React subscription
- Canvas/PixiJS render loop reads store values imperatively, never triggers React re-renders

### 15.3 Component Hierarchy

```
<AppShell>                              # Multi-sport wrapper, sport switcher
├── <SessionHeader />                   # Status bar (always visible)
├── <LiveConsoleLayout>                 # CSS Grid: 100vh - header
│   ├── <TimingTower />                 # Left panel
│   │   ├── <TimingRow />              # × 20 drivers
│   │   │   ├── <PositionBadge />
│   │   │   ├── <TeamColorStripe />
│   │   │   ├── <DriverCode />
│   │   │   ├── <GapDisplay />
│   │   │   ├── <IntervalDisplay />
│   │   │   ├── <SectorTime /> × 3
│   │   │   ├── <TireCompoundIcon />
│   │   │   ├── <TireAge />
│   │   │   ├── <PitCount />
│   │   │   └── <PenaltyBadge />       # with HoverCard
│   │   └── <TimingTowerControls />     # Column visibility toggles
│   │
│   ├── <TrackMap />                    # Center panel (PixiJS Canvas)
│   │   ├── <TrackOutline />           # SVG path rendered on Canvas
│   │   ├── <DrsZones />
│   │   ├── <SectorBoundaries />
│   │   ├── <DriverDots />            # 20 animated circles
│   │   ├── <FlagOverlays />
│   │   ├── <IncidentMarkers />
│   │   ├── <SafetyCarIcon />
│   │   ├── <DriverFocusModal />
│   │   └── <FullscreenToggle />
│   │
│   ├── <RightPanel>                    # Right panel
│   │   ├── <Tabs>
│   │   │   ├── <RaceControlFeed />
│   │   │   └── <TeamRadioFeed />
│   │   └── <FilterControls />
│   │
│   └── <BottomBar>
│       ├── <DnfTicker />
│       ├── <SpeedTrapWidget />
│       ├── <TireStrategyMini />
│       ├── <WeatherWidget />
│       └── <PaceSparkline />
│
├── <ProToolsOverlay />                 # Toggled by Pro Mode button
│   ├── <PitWindowCalculator />
│   ├── <PaceDeltaChart />
│   ├── <TireDegradationChart />
│   ├── <RacePaceTable />
│   └── <CommandPalette />             # Cmd+K instant lookup
│
└── <HistoricalPages>                   # Server-rendered pages
    ├── <SeasonExplorer />
    ├── <RaceArchive />
    ├── <DriverProfile />
    ├── <ConstructorProfile />
    ├── <CircuitProfile />
    ├── <RecordsPage />
    ├── <TelemetryComparison />
    ├── <StandingsPage />
    └── <SearchPage />
```

### 15.4 Data Flow for Live Console

```
OpenF1 API (external)
      │
      ▼ (poll @1-3Hz)
Ingestion Worker (Node.js)
      │
      ├─── SET ──→ Redis KV (live:standings, live:weather, ...)
      ├─── XADD ─→ Redis Streams (stream:positions, stream:telemetry:*)
      └─── PUB ──→ Redis Pub/Sub (channel:race_control, channel:pit, ...)
                       │
                       ▼ (subscribe)
              WebSocket Server (Socket.io)
                       │
                       ├─ Room "live:race" ──→ @2Hz ──→ useStandingsStore
                       ├─ Room "live:map" ───→ @5Hz ──→ usePositionsStore
                       ├─ Room "live:events" → on-event → useRaceControlStore
                       └─ Room "live:telemetry:car:1" → @5Hz → useTelemetryStore
                                                                      │
                                                                      ▼
                                                              React Components
                                                              (selective re-render)
                                                                      │
                                                                      ▼
                                                              PixiJS Canvas
                                                              (imperative reads via
                                                               getState() in rAF loop)
```

---

## 16. Cross-Platform Strategy

### 16.1 Platform Matrix

| Platform | Technology | Rendering | Distribution |
|----------|-----------|-----------|-------------|
| **Web** | Next.js in browser | DOM + Canvas | URL (hosted) |
| **Desktop** | Electron + Next.js | Same as web (Chromium) | `.dmg`, `.exe`, `.AppImage` |
| **Mobile** | Expo / React Native | RN components + `react-native-skia` for map | App Store, Play Store |

### 16.2 Electron Features
- "Always on top" toggle
- System tray with quick status
- Native OS notifications (penalties, SC, red flags)
- Global keyboard shortcuts (Cmd+F = fullscreen, Cmd+K = search)
- Multi-window support

### 16.3 Shared Package Architecture

```
packages/
├── @pitwall/types          # TypeScript interfaces for all data models
├── @pitwall/api-client     # REST API client (fetch-based, works everywhere)
├── @pitwall/socket-client  # Socket.io connection manager
├── @pitwall/stores         # Zustand stores (framework-agnostic)
├── @pitwall/utils          # Time formatting, color utils, calculations
└── @pitwall/constants      # Team colors, penalty types, flag definitions
```

---

## 17. Monorepo Structure

```
pitwall/
├── apps/
│   ├── web/                          # Next.js web application
│   │   ├── app/                      # App Router pages
│   │   │   ├── (shell)/              # Multi-sport shell layout
│   │   │   │   └── f1/              # All F1 routes
│   │   │   │       ├── live/
│   │   │   │       ├── seasons/
│   │   │   │       ├── drivers/
│   │   │   │       ├── constructors/
│   │   │   │       ├── circuits/
│   │   │   │       ├── records/
│   │   │   │       ├── compare/
│   │   │   │       ├── standings/
│   │   │   │       ├── calendar/
│   │   │   │       └── search/
│   │   │   └── api/                  # API routes
│   │   ├── components/               # Web-specific React components
│   │   │   ├── live/                 # Live console components
│   │   │   ├── historical/           # Historical data pages
│   │   │   ├── pro-tools/            # Commentator tools
│   │   │   ├── charts/               # Chart components
│   │   │   └── ui/                   # Shadcn components
│   │   └── lib/
│   │       ├── track-maps/           # Circuit SVG + coordinate data
│   │       └── pixi/                 # PixiJS scene setup
│   │
│   ├── desktop/                      # Electron wrapper
│   │   ├── main/                     # Main process (tray, shortcuts)
│   │   └── preload/
│   │
│   └── mobile/                       # Expo React Native app
│       ├── app/                      # Expo Router pages
│       └── components/               # RN-specific components
│
├── packages/                         # Shared packages (see 16.3)
│   ├── types/
│   ├── api-client/
│   ├── socket-client/
│   ├── stores/
│   ├── utils/
│   ├── constants/
│   └── db/                           # Prisma/Drizzle ORM
│
├── services/
│   ├── ingestion/                    # Data ingestion worker
│   ├── ws-server/                    # WebSocket broadcast server
│   └── enrichment/                   # Python FastF1 enrichment
│
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── scripts/                      # Seed, migrate scripts
│
├── assets/
│   ├── track-maps/                   # Circuit SVGs + coordinate data
│   ├── icons/                        # Custom F1 SVG icons
│   └── fonts/
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 18. Deployment & Infrastructure

### 18.1 Docker Compose (Development)

```yaml
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: pitwall
      POSTGRES_USER: pitwall
      POSTGRES_PASSWORD: pitwall_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru

  ingestion:
    build: ./services/ingestion
    depends_on: [redis, postgres]

  ws-server:
    build: ./services/ws-server
    ports: ["3001:3001"]
    depends_on: [redis]

  web:
    build: ./apps/web
    ports: ["3000:3000"]
    depends_on: [postgres, ws-server]
```

### 18.2 Production Architecture

- CDN (CloudFlare/CloudFront) → Nginx reverse proxy → Next.js (×2-3) + WS Server + Ingestion Worker (×1 only)
- Managed PostgreSQL (RDS or DigitalOcean)
- Managed Redis (ElastiCache or DigitalOcean)

---

## 19. Testing Strategy

| Level | Tool | What to Test |
|-------|------|-------------|
| **Unit** | Vitest | Store logic, utilities, time formatters, calculations |
| **Component** | Vitest + RTL | Timing tower, penalty hover card, weather widget |
| **Integration** | Vitest + MSW | API routes, data fetching, WebSocket handling |
| **Visual** | Playwright | Screenshot comparisons of key views |
| **E2E** | Playwright | Full user flows |
| **Performance** | Lighthouse CI | LCP < 2.5s, FPS monitoring |
| **Load** | k6 | 1000+ concurrent WebSocket connections |

**Test Data:** Mock WebSocket server + recorded session replay + Jolpica historical seed data

---

## 20. Performance Budgets & Optimization

| Metric | Target |
|--------|--------|
| Track map FPS | ≥ 55 fps sustained |
| Timing tower update | < 16ms render |
| WebSocket → UI latency | < 100ms |
| Initial page load (LCP) | < 2.5s (historical pages) |
| Live console hydration | < 3s |
| Bundle size (main) | < 250KB gzipped |
| Memory (live console) | < 200MB for 30min |
| Redis memory | < 256MB during live session |

**Key Optimizations:**
- PixiJS Canvas instead of DOM for map (no layout thrashing)
- Imperative store reads (`getState()`) in animation loop
- Selective Zustand subscriptions per driver
- Web Workers for heavy calculations
- Code splitting: Historical + Pro Tools lazy-loaded
- `next/font` with subsetting for Orbitron/JetBrains Mono

---

## 21. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Initialize Turborepo + Next.js + TypeScript
- Tailwind + Shadcn UI (F1 theme customization)
- AppShell layout (header + 4-panel CSS Grid at 100vh)
- Docker Compose (TimescaleDB + Redis)
- Prisma/Drizzle schema from Section 12
- Shared packages: types, constants, utils

### Phase 2: Data Pipeline (Week 2-3)
- Ingestion worker with OpenF1 REST poller
- Rate limiting + exponential backoff
- Redis writer (KV + Streams + Pub/Sub)
- Historical seeder from Jolpica
- Circuit SVG data seeding
- BullMQ job queue + post-session archival

### Phase 3: WebSocket Server (Week 3)
- Socket.io server connected to Redis
- Room-based broadcasting
- Broadcast throttling + compression
- Mock replay server for development

### Phase 4: Timing Tower (Week 3-4)
- Zustand stores + Socket.io client
- Full timing tower with all columns
- Smooth row reordering animation
- Penalty HoverCards + tire/sector components
- Column visibility toggles

### Phase 5: Track Map (Week 4-5)
- PixiJS renderer + React integration
- Circuit outline from SVG path data
- Coordinate mapping (telemetry → canvas)
- Driver dots with lerp interpolation @60fps
- DRS zones + flag overlays + SC icon
- Driver Focus Modal + fullscreen mode

### Phase 6: Right Panel + Bottom Bar (Week 5-6)
- Race control feed + team radio feed
- Session header status bar
- Weather/DNF/speed trap/tire widgets
- Pace sparkline

### Phase 7: Historical Database (Week 6-8)
- Season explorer + race archive pages
- Lap chart + tire strategy diagram
- Grid vs finish visualizer
- Standings + records + search pages

### Phase 8: Profiles (Week 8-9)
- Driver profiles with stats + charts
- Teammate head-to-head
- Constructor profiles + team timeline
- Car development tracker

### Phase 9: Circuits (Week 9-10)
- Circuit profiles with corner guide
- Elevation profile + race history
- Lap time evolution + overtaking stats

### Phase 10: Pro Tools (Week 10-11)
- Pit window calculator
- Pace delta + tire degradation charts
- Race pace table + command palette
- Championship scenario calculator

### Phase 11: Telemetry Comparison (Week 11-12) - COMPLETED
- Select 2 drivers + session
- Speed/throttle/brake/gear trace overlays
- Ghost car map overlay
- FastF1 enrichment integration

### Phase 12: Cross-Platform (Week 12-14) - COMPLETED
- Electron wrapper (always-on-top, tray, notifications)
- Expo project with shared stores
- React Native track map (react-native-skia)

### Phase 13: Polish & QA (Week 14-16) - COMPLETED
- Performance profiling + optimization
- Visual regression + accessibility audit
- Load testing (1000+ concurrent WS connections)
- Error boundaries + loading skeletons
- Progressive enhancement (poll fallback)

---

## 22. Appendix: F1 Regulation Reference Data

### Race Weekend Format (Standard)
| Day | Session | Duration |
|-----|---------|----------|
| Friday | FP1 | 60 min |
| Friday | FP2 | 60 min |
| Saturday | FP3 | 60 min |
| Saturday | Qualifying (Q1→Q2→Q3) | ~60 min |
| Sunday | Race | ~90-120 min (max 2 hours) |

### Sprint Weekend Format
| Day | Session | Duration |
|-----|---------|----------|
| Friday | FP1 | 60 min |
| Friday | Sprint Qualifying | ~45 min |
| Saturday | Sprint Race | ~30 min (100km) |
| Saturday | Qualifying | ~60 min |
| Sunday | Race | ~90-120 min |

### Points Systems
- **Race (Top 10):** 25-18-15-12-10-8-6-4-2-1 (+1 for fastest lap if in top 10)
- **Sprint (Top 8):** 8-7-6-5-4-3-2-1

### Flag Meanings
| Flag | Meaning | Action Required |
|------|---------|----------------|
| 🟢 Green | Track clear | Normal racing |
| 🟡 Single Yellow | Hazard near track | Slow down, no overtaking in zone |
| 🟡🟡 Double Yellow | Significant hazard | Slow significantly, prepare to stop |
| 🔴 Red | Session stopped | Slow down, return to pits |
| 🔵 Blue | Faster car lapping | Must yield within 3 marshal posts |
| ⚫🟠 Meatball | Mechanical problem | Return to pits immediately |
| ⚫ Black | Disqualification | Return to pits, excluded |
| ⬜⚫ Black/White | Unsportsmanlike warning | Warning — next = penalty |
| 🏁 Chequered | Session end | Complete lap, slow down |

### Penalty Severity
| Penalty | Severity | Common Offenses |
|---------|----------|-----------------|
| Track Limits Warning | Lowest | Exceeding limits repeatedly |
| Black & White Flag | Low | Weaving, unsportsmanlike |
| 5s Time Penalty | Medium | Causing collision, off-track advantage |
| 10s Time Penalty | Medium-High | Severe collision, repeated offense |
| Drive-Through | High | Unsafe release, pit lane speeding |
| 5s Stop-Go | High | Serious incident causing damage |
| 10s Stop-Go | Very High | Very serious incident |
| Disqualification | Maximum | Technical breach, dangerous driving |
| Grid Penalty | Varies | Power unit/gearbox changes, reprimands |

### Tire Rules
- 13 sets of dry tires per standard weekend
- Must use 2+ different dry compounds in a dry race
- Unlimited intermediate and wet sets
- Q3 participants start on Q2 fastest lap tires (unless rain)

### DRS Rules
- Activated within 1 second of car ahead at detection point
- Disabled for first 2 laps of race/restart
- Disabled during yellow/SC/VSC
- 1-3 activation zones per circuit

---

> **END OF MASTER PLAN v3.0**
>
> This document serves as the comprehensive blueprint for the PitWall F1 Command Center.
> Each section can be broken into individual sub-plans for implementation agents.
> The plan is structured so that each Phase (Section 21) can be assigned independently
> with clear inputs, outputs, and dependencies.

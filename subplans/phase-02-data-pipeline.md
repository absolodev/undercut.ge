# Phase 2: Data Pipeline (Week 2-3)

## Overview
Build the backend ingestion layer that polls external F1 APIs, normalizes the data, and writes it to Redis (for live state) and PostgreSQL (for historical persistence). This is the "Single Ingestor" pattern — one backend process handles all external API communication so clients never touch external APIs.

## Prerequisites
- Phase 1 complete (Docker running, Prisma schema pushed, shared packages ready)
- Redis and PostgreSQL accessible at `localhost:6379` and `localhost:5432`

## Deliverables
- `services/ingestion/` — Node.js worker that polls OpenF1
- Rate limiter respecting 3 req/s (free tier)
- Redis writer: KV state, Streams, Pub/Sub
- `services/ingestion/seeders/` — Jolpica historical data seeder
- BullMQ job queue for async tasks
- Post-session archival job (Redis → PostgreSQL)
- Circuit SVG coordinate data seeding

---

## Task Breakdown

### 2.1 Ingestion Worker Init

```bash
cd services/ingestion
pnpm init
pnpm add ioredis bullmq node-fetch@3 pino p-queue
pnpm add -D typescript @types/node tsx
```

**`services/ingestion/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"]
}
```

**Directory structure:**
```
services/ingestion/
├── src/
│   ├── index.ts                  # Entry point — starts session manager
│   ├── session-manager.ts        # Detects active sessions, starts/stops polling
│   ├── config.ts                 # Environment variables, polling intervals
│   ├── pollers/
│   │   ├── base-poller.ts        # Abstract poller with rate limiting
│   │   ├── car-data-poller.ts    # /car_data endpoint (300ms)
│   │   ├── location-poller.ts    # /location endpoint (300ms)
│   │   ├── intervals-poller.ts   # /intervals endpoint (500ms)
│   │   ├── laps-poller.ts        # /laps endpoint (1000ms)
│   │   ├── position-poller.ts    # /position endpoint (500ms)
│   │   ├── race-control-poller.ts# /race_control endpoint (1000ms)
│   │   ├── stints-poller.ts      # /stints endpoint (2000ms)
│   │   ├── pit-poller.ts         # /pit endpoint (2000ms)
│   │   ├── team-radio-poller.ts  # /team_radio endpoint (3000ms)
│   │   └── weather-poller.ts     # /weather endpoint (10000ms)
│   ├── writers/
│   │   ├── redis-kv-writer.ts    # SET with TTL for current state
│   │   ├── redis-stream-writer.ts# XADD for telemetry/positions
│   │   └── redis-pubsub-writer.ts# PUBLISH for events
│   ├── normalizers/
│   │   └── openf1-normalizer.ts  # Maps OpenF1 schema → internal types
│   ├── seeders/
│   │   ├── jolpica-seeder.ts     # Historical data from Jolpica API
│   │   └── circuit-seeder.ts     # Circuit SVG + coordinate data
│   ├── jobs/
│   │   ├── queue.ts              # BullMQ queue setup
│   │   ├── archive-session.ts    # Redis → PostgreSQL archival
│   │   └── enrich-session.ts     # FastF1 Python enrichment trigger
│   └── lib/
│       ├── redis.ts              # Redis client singleton
│       ├── rate-limiter.ts       # Token bucket rate limiter
│       └── logger.ts             # Pino logger
├── package.json
└── tsconfig.json
```

### 2.2 Rate Limiter (Token Bucket)

```typescript
// src/lib/rate-limiter.ts
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxRequestsPerSecond: number) {
    this.maxTokens = maxRequestsPerSecond;
    this.tokens = maxRequestsPerSecond;
    this.refillRate = maxRequestsPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Global rate limiter for OpenF1 (3 req/s free tier)
export const openF1Limiter = new RateLimiter(2.5); // Leave headroom
```

### 2.3 Base Poller

```typescript
// src/pollers/base-poller.ts
import { openF1Limiter } from "../lib/rate-limiter";
import { logger } from "../lib/logger";

const OPENF1_BASE = "https://api.openf1.org/v1";

export abstract class BasePoller {
  protected endpoint: string;
  protected intervalMs: number;
  protected lastTimestamp: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private backoffMs = 0;
  private readonly maxBackoffMs = 30_000;

  constructor(endpoint: string, intervalMs: number) {
    this.endpoint = endpoint;
    this.intervalMs = intervalMs;
  }

  start(sessionKey: number): void {
    this.lastTimestamp = null;
    this.backoffMs = 0;
    this.tick(sessionKey);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async tick(sessionKey: number): Promise<void> {
    try {
      await openF1Limiter.acquire();
      const params = new URLSearchParams({ session_key: String(sessionKey) });
      if (this.lastTimestamp) params.set("date>", this.lastTimestamp);

      const url = `${OPENF1_BASE}/${this.endpoint}?${params}`;
      const res = await fetch(url);

      if (res.status === 429) {
        this.backoffMs = Math.min(this.backoffMs * 2 || 1000, this.maxBackoffMs);
        logger.warn({ endpoint: this.endpoint, backoff: this.backoffMs }, "Rate limited, backing off");
      } else if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          this.lastTimestamp = data[data.length - 1].date || new Date().toISOString();
          await this.onData(data, sessionKey);
        }
        this.backoffMs = 0; // Reset backoff on success
      }
    } catch (err) {
      logger.error({ endpoint: this.endpoint, err }, "Poller error");
      this.backoffMs = Math.min(this.backoffMs * 2 || 1000, this.maxBackoffMs);
    }

    this.timer = setTimeout(() => this.tick(sessionKey), this.intervalMs + this.backoffMs);
  }

  protected abstract onData(data: any[], sessionKey: number): Promise<void>;
}
```

### 2.4 Specific Pollers (Examples)

```typescript
// src/pollers/location-poller.ts
import { BasePoller } from "./base-poller";
import { redisStreamWriter } from "../writers/redis-stream-writer";

export class LocationPoller extends BasePoller {
  constructor() {
    super("location", 300); // 300ms = 3.3Hz
  }

  protected async onData(data: any[]): Promise<void> {
    // Group by timestamp for batch position updates
    const latest = new Map<number, { x: number; y: number; z: number }>();
    for (const d of data) {
      latest.set(d.driver_number, { x: d.x, y: d.y, z: d.z });
    }
    const positions = Array.from(latest.entries()).map(([num, pos]) => ({
      driverNumber: num,
      ...pos,
    }));
    await redisStreamWriter.writePositions(positions);
  }
}
```

```typescript
// src/pollers/race-control-poller.ts
import { BasePoller } from "./base-poller";
import { redisPubSubWriter } from "../writers/redis-pubsub-writer";
import { redisKvWriter } from "../writers/redis-kv-writer";

export class RaceControlPoller extends BasePoller {
  constructor() {
    super("race_control", 1000);
  }

  protected async onData(data: any[]): Promise<void> {
    for (const msg of data) {
      const normalized = {
        id: `rcm-${msg.date}`,
        lap: msg.lap_number,
        category: this.categorize(msg.category),
        flag: msg.flag,
        message: msg.message,
        driverNumber: msg.driver_number,
        sector: msg.sector,
        timestamp: msg.date,
      };
      await redisPubSubWriter.publishRaceControl(normalized);

      // Update track status if flag change
      if (msg.flag) {
        await redisKvWriter.setTrackStatus(msg.flag, msg.message);
      }
    }
  }

  private categorize(cat: string): string {
    const map: Record<string, string> = {
      Flag: "Flag", SafetyCar: "SafetyCar", Drs: "Drs",
      CarEvent: "Other", Other: "Other",
    };
    return map[cat] || "Other";
  }
}
```

### 2.5 Redis Writers

```typescript
// src/writers/redis-kv-writer.ts
import { redis } from "../lib/redis";

const TTL = 600; // 10 minutes

export const redisKvWriter = {
  async setStandings(standings: any[]): Promise<void> {
    await redis.set("live:standings", JSON.stringify(standings), "EX", TTL);
  },

  async setDriverState(driverNumber: number, state: any): Promise<void> {
    await redis.set(`live:driver:${driverNumber}:state`, JSON.stringify(state), "EX", TTL);
  },

  async setWeather(weather: any): Promise<void> {
    await redis.set("live:weather", JSON.stringify(weather), "EX", TTL);
  },

  async setTrackStatus(flag: string, message: string): Promise<void> {
    await redis.set("live:track:status", JSON.stringify({ status: flag, message }), "EX", TTL);
  },

  async setLapCount(current: number, total: number): Promise<void> {
    await redis.set("live:lap", JSON.stringify({ current, total }), "EX", TTL);
  },

  async setSessionInfo(info: any): Promise<void> {
    await redis.set("live:session:info", JSON.stringify(info), "EX", TTL);
  },
};
```

```typescript
// src/writers/redis-stream-writer.ts
import { redis } from "../lib/redis";

export const redisStreamWriter = {
  async writePositions(positions: any[]): Promise<void> {
    await redis.xadd(
      "stream:positions",
      "MAXLEN", "~", "2000",
      "*",
      "data", JSON.stringify(positions),
      "ts", Date.now().toString()
    );
  },

  async writeTelemetry(driverNumber: number, telemetry: any): Promise<void> {
    await redis.xadd(
      `stream:telemetry:car:${driverNumber}`,
      "MAXLEN", "~", "5000",
      "*",
      "data", JSON.stringify(telemetry),
      "ts", Date.now().toString()
    );
  },
};
```

```typescript
// src/writers/redis-pubsub-writer.ts
import { redis } from "../lib/redis";

export const redisPubSubWriter = {
  async publishRaceControl(message: any): Promise<void> {
    await redis.publish("channel:race_control", JSON.stringify(message));
  },

  async publishTeamRadio(message: any): Promise<void> {
    await redis.publish("channel:team_radio", JSON.stringify(message));
  },

  async publishPitEvent(event: any): Promise<void> {
    await redis.publish("channel:pit", JSON.stringify(event));
  },

  async publishTrackStatus(status: any): Promise<void> {
    await redis.publish("channel:track_status", JSON.stringify(status));
  },
};
```

### 2.6 Session Manager

```typescript
// src/session-manager.ts
import { LocationPoller } from "./pollers/location-poller";
import { CarDataPoller } from "./pollers/car-data-poller";
import { IntervalsPoller } from "./pollers/intervals-poller";
import { LapsPoller } from "./pollers/laps-poller";
import { PositionPoller } from "./pollers/position-poller";
import { RaceControlPoller } from "./pollers/race-control-poller";
import { StintsPoller } from "./pollers/stints-poller";
import { PitPoller } from "./pollers/pit-poller";
import { TeamRadioPoller } from "./pollers/team-radio-poller";
import { WeatherPoller } from "./pollers/weather-poller";
import { logger } from "./lib/logger";

export class SessionManager {
  private currentSessionKey: number | null = null;
  private pollers = [
    new CarDataPoller(),
    new LocationPoller(),
    new IntervalsPoller(),
    new LapsPoller(),
    new PositionPoller(),
    new RaceControlPoller(),
    new StintsPoller(),
    new PitPoller(),
    new TeamRadioPoller(),
    new WeatherPoller(),
  ];

  async start(): Promise<void> {
    logger.info("Session manager started, checking for active sessions...");
    this.checkForSession();
    // Check every 30s for new sessions
    setInterval(() => this.checkForSession(), 30_000);
  }

  private async checkForSession(): Promise<void> {
    try {
      const res = await fetch("https://api.openf1.org/v1/sessions?session_key=latest");
      const sessions = await res.json();
      if (!sessions.length) return;

      const session = sessions[0];
      const isActive = session.date_end === null || new Date(session.date_end) > new Date();

      if (isActive && session.session_key !== this.currentSessionKey) {
        logger.info({ sessionKey: session.session_key, name: session.session_name }, "New active session detected");
        this.stopPollers();
        this.currentSessionKey = session.session_key;
        this.startPollers(session.session_key);
      } else if (!isActive && this.currentSessionKey) {
        logger.info("Session ended, stopping pollers");
        this.stopPollers();
        this.currentSessionKey = null;
        // Trigger archival job
      }
    } catch (err) {
      logger.error({ err }, "Failed to check for sessions");
    }
  }

  private startPollers(sessionKey: number): void {
    for (const poller of this.pollers) {
      poller.start(sessionKey);
    }
  }

  private stopPollers(): void {
    for (const poller of this.pollers) {
      poller.stop();
    }
  }
}
```

### 2.7 Jolpica Historical Seeder

```typescript
// src/seeders/jolpica-seeder.ts
import { prisma } from "@pitwall/db";
import { logger } from "../lib/logger";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const DELAY_MS = 300; // Respect rate limits

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function seedSeasons(startYear = 1950, endYear = 2025): Promise<void> {
  logger.info({ startYear, endYear }, "Seeding seasons");
  const res = await fetch(`${JOLPICA_BASE}/seasons.json?limit=100&offset=${startYear - 1950}`);
  const data = await res.json();
  for (const s of data.MRData.SeasonTable.Seasons) {
    await prisma.f1_seasons.upsert({
      where: { year: parseInt(s.season) },
      update: {},
      create: { year: parseInt(s.season) },
    });
  }
}

export async function seedDrivers(): Promise<void> {
  logger.info("Seeding drivers");
  let offset = 0;
  while (true) {
    const res = await fetch(`${JOLPICA_BASE}/drivers.json?limit=100&offset=${offset}`);
    const data = await res.json();
    const drivers = data.MRData.DriverTable.Drivers;
    if (!drivers.length) break;
    for (const d of drivers) {
      await prisma.f1_drivers.upsert({
        where: { driver_ref: d.driverId },
        update: {},
        create: {
          driver_ref: d.driverId,
          broadcast_name: d.code || d.driverId.substring(0, 3).toUpperCase(),
          first_name: d.givenName,
          last_name: d.familyName,
          full_name: `${d.givenName} ${d.familyName}`,
          permanent_number: d.permanentNumber ? parseInt(d.permanentNumber) : null,
          date_of_birth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
          nationality: d.nationality,
        },
      });
    }
    offset += 100;
    await delay(DELAY_MS);
  }
}

export async function seedCircuits(): Promise<void> {
  logger.info("Seeding circuits");
  const res = await fetch(`${JOLPICA_BASE}/circuits.json?limit=100`);
  const data = await res.json();
  for (const c of data.MRData.CircuitTable.Circuits) {
    await prisma.f1_circuits.upsert({
      where: { circuit_ref: c.circuitId },
      update: {},
      create: {
        circuit_ref: c.circuitId,
        name: c.circuitName,
        locality: c.Location.locality,
        country: c.Location.country,
        latitude: parseFloat(c.Location.lat),
        longitude: parseFloat(c.Location.long),
      },
    });
  }
}

export async function seedRaceResults(seasonYear: number): Promise<void> {
  logger.info({ season: seasonYear }, "Seeding race results");
  const res = await fetch(`${JOLPICA_BASE}/${seasonYear}/results.json?limit=500`);
  const data = await res.json();
  const races = data.MRData.RaceTable.Races;

  for (const race of races) {
    // Upsert race
    const dbRace = await prisma.f1_races.upsert({
      where: { season_year_round: { season_year: seasonYear, round: parseInt(race.round) } },
      update: {},
      create: {
        season_year: seasonYear,
        round: parseInt(race.round),
        race_name: race.raceName,
        race_date: new Date(race.date),
        circuit_id: (await prisma.f1_circuits.findUnique({ where: { circuit_ref: race.Circuit.circuitId } }))!.id,
      },
    });

    // Upsert session (Race type)
    const dbSession = await prisma.f1_sessions.upsert({
      where: { id: dbRace.id }, // simplified — use composite in real impl
      update: {},
      create: {
        race_id: dbRace.id,
        session_type: "R",
        session_name: "Race",
        date_start: new Date(race.date),
      },
    });

    // Insert results
    for (const result of race.Results) {
      const driver = await prisma.f1_drivers.findUnique({
        where: { driver_ref: result.Driver.driverId },
      });
      const constructor = await prisma.f1_constructors.findUnique({
        where: { constructor_ref: result.Constructor.constructorId },
      });
      if (!driver || !constructor) continue;

      await prisma.f1_results.upsert({
        where: { session_id_driver_id: { session_id: dbSession.id, driver_id: driver.id } },
        update: {},
        create: {
          session_id: dbSession.id,
          driver_id: driver.id,
          constructor_id: constructor.id,
          grid_position: parseInt(result.grid),
          finish_position: result.position === "R" ? null : parseInt(result.position),
          position_text: result.positionText,
          classification: result.status === "Finished" ? "Finished" : "DNF",
          status: result.status,
          points: parseFloat(result.points),
          laps_completed: parseInt(result.laps),
        },
      });
    }
    await delay(DELAY_MS);
  }
}

// Master seed function
export async function seedAll(): Promise<void> {
  await seedSeasons();
  await seedDrivers();
  await seedCircuits();
  // Seed constructors similarly
  // Seed results for recent seasons
  for (let year = 2020; year <= 2025; year++) {
    await seedRaceResults(year);
  }
  logger.info("Historical seeding complete");
}
```

### 2.8 BullMQ Job Queue

```typescript
// src/jobs/queue.ts
import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis";

export const archiveQueue = new Queue("archive", { connection: redis });

export function startWorkers(): void {
  new Worker("archive", async (job) => {
    switch (job.name) {
      case "archive:session":
        const { archiveSession } = await import("./archive-session");
        await archiveSession(job.data.sessionKey);
        break;
      case "enrich:session":
        const { enrichSession } = await import("./enrich-session");
        await enrichSession(job.data.sessionKey);
        break;
    }
  }, { connection: redis, concurrency: 1 });
}
```

### 2.9 Polling Intervals Reference

| Endpoint | Interval | Redis Target | Key/Stream/Channel |
|----------|----------|-------------|-------------------|
| `/car_data` | 300ms | Stream | `stream:telemetry:car:{N}` |
| `/location` | 300ms | Stream | `stream:positions` |
| `/intervals` | 500ms | KV | `live:standings` |
| `/laps` | 1000ms | KV per driver | `live:driver:{N}:state` |
| `/position` | 500ms | Stream | `stream:positions` (merged) |
| `/race_control` | 1000ms | Pub/Sub + KV | `channel:race_control` + `live:track:status` |
| `/stints` | 2000ms | KV per driver | `live:driver:{N}:state` |
| `/pit` | 2000ms | Pub/Sub | `channel:pit` |
| `/team_radio` | 3000ms | Pub/Sub | `channel:team_radio` |
| `/weather` | 10000ms | KV | `live:weather` |

---

## Acceptance Criteria
- [ ] `pnpm --filter ingestion dev` starts without errors
- [ ] Session manager detects latest session from OpenF1
- [ ] Pollers fetch data and write to Redis (verify with `redis-cli KEYS "live:*"`)
- [ ] Redis streams populated (verify with `redis-cli XLEN stream:positions`)
- [ ] Rate limiter keeps requests under 3/s (check logs)
- [ ] Exponential backoff works on 429 responses
- [ ] Jolpica seeder populates PostgreSQL with seasons, drivers, circuits, results
- [ ] `pnpm db:studio` shows seeded data

## Key Dependencies
```
ioredis bullmq p-queue pino node-fetch@3
tsx (dev runner)
@pitwall/types @pitwall/db (workspace deps)
```

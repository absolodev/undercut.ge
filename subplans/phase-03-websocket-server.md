# Phase 3: WebSocket Server (Week 3)

## Overview
Build the Socket.io WebSocket server that subscribes to Redis data (Streams, Pub/Sub, KV) and broadcasts to connected clients in real-time. This is the bridge between the ingestion worker and the frontend. Also build a mock replay server for development without live sessions.

## Prerequisites
- Phase 2 complete (ingestion worker writing to Redis)
- Redis running with live data or test data

## Deliverables
- `services/ws-server/` — Socket.io server with room-based broadcasting
- Redis consumer (Streams + Pub/Sub subscriber)
- Throttled broadcasting (2Hz for standings, 5Hz for positions)
- `perMessageDeflate` WebSocket compression
- Mock replay server loading recorded session JSON
- Auto-reconnection handling
- Connection metrics logging

---

## Task Breakdown

### 3.1 WebSocket Server Init

```bash
cd services/ws-server
pnpm init
pnpm add socket.io ioredis pino cors
pnpm add -D typescript @types/node tsx
```

**Directory structure:**
```
services/ws-server/
├── src/
│   ├── index.ts                   # Entry: create HTTP + Socket.io server
│   ├── config.ts                  # Ports, Redis URL, throttle intervals
│   ├── socket-server.ts           # Socket.io setup, room management
│   ├── redis-consumer.ts          # Subscribe to Redis Streams + Pub/Sub
│   ├── broadcasters/
│   │   ├── standings-broadcaster.ts   # live:race room @2Hz
│   │   ├── positions-broadcaster.ts   # live:map room @5Hz
│   │   ├── telemetry-broadcaster.ts   # live:telemetry:car:{N} @5Hz
│   │   └── events-broadcaster.ts      # live:events room on-event
│   ├── throttle.ts                # Throttled emit helper
│   ├── mock-replay.ts             # Dev-mode recorded session replay
│   └── metrics.ts                 # Connection tracking
├── recordings/                    # Recorded session JSON files
│   └── sample-race.json
├── package.json
└── tsconfig.json
```

### 3.2 Socket.io Server Setup

```typescript
// src/socket-server.ts
import { Server } from "socket.io";
import http from "http";
import { logger } from "./lib/logger";
import { metrics } from "./metrics";

export function createSocketServer(httpServer: http.Server): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"],
    },
    // Enable WebSocket compression
    perMessageDeflate: {
      threshold: 1024, // Only compress messages > 1KB
      zlibDeflateOptions: { level: 6 },
    },
    // Transport config
    transports: ["websocket", "polling"],
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    metrics.connections++;
    logger.info({ id: socket.id, total: metrics.connections }, "Client connected");

    // All clients auto-join these rooms
    socket.join("live:race");
    socket.join("live:events");

    // Client requests map data (opt-in for bandwidth)
    socket.on("subscribe:map", () => {
      socket.join("live:map");
      logger.debug({ id: socket.id }, "Subscribed to map");
    });

    socket.on("unsubscribe:map", () => {
      socket.leave("live:map");
    });

    // Client requests specific car telemetry
    socket.on("subscribe:telemetry", (driverNumber: number) => {
      // Leave all other telemetry rooms first
      for (const room of socket.rooms) {
        if (room.startsWith("live:telemetry:car:")) socket.leave(room);
      }
      socket.join(`live:telemetry:car:${driverNumber}`);
      logger.debug({ id: socket.id, car: driverNumber }, "Subscribed to car telemetry");
    });

    socket.on("unsubscribe:telemetry", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("live:telemetry:car:")) socket.leave(room);
      }
    });

    socket.on("disconnect", (reason) => {
      metrics.connections--;
      logger.debug({ id: socket.id, reason, total: metrics.connections }, "Client disconnected");
    });
  });

  return io;
}
```

### 3.3 Entry Point

```typescript
// src/index.ts
import http from "http";
import { createSocketServer } from "./socket-server";
import { RedisConsumer } from "./redis-consumer";
import { StandingsBroadcaster } from "./broadcasters/standings-broadcaster";
import { PositionsBroadcaster } from "./broadcasters/positions-broadcaster";
import { TelemetryBroadcaster } from "./broadcasters/telemetry-broadcaster";
import { EventsBroadcaster } from "./broadcasters/events-broadcaster";
import { logger } from "./lib/logger";

const PORT = parseInt(process.env.WS_PORT || "3001");

async function main() {
  const httpServer = http.createServer();
  const io = createSocketServer(httpServer);

  // Initialize broadcasters
  const standingsBroadcaster = new StandingsBroadcaster(io);
  const positionsBroadcaster = new PositionsBroadcaster(io);
  const telemetryBroadcaster = new TelemetryBroadcaster(io);
  const eventsBroadcaster = new EventsBroadcaster(io);

  // Connect Redis consumer → broadcasters
  const consumer = new RedisConsumer({
    onStandings: (data) => standingsBroadcaster.enqueue(data),
    onPositions: (data) => positionsBroadcaster.enqueue(data),
    onTelemetry: (num, data) => telemetryBroadcaster.enqueue(num, data),
    onRaceControl: (msg) => eventsBroadcaster.emitRaceControl(msg),
    onTeamRadio: (msg) => eventsBroadcaster.emitTeamRadio(msg),
    onPit: (evt) => eventsBroadcaster.emitPit(evt),
    onTrackStatus: (status) => eventsBroadcaster.emitTrackStatus(status),
  });

  await consumer.start();

  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, "WebSocket server running");
  });
}

main().catch(console.error);
```

### 3.4 Redis Consumer

```typescript
// src/redis-consumer.ts
import Redis from "ioredis";
import { logger } from "./lib/logger";

interface ConsumerCallbacks {
  onStandings: (data: any) => void;
  onPositions: (data: any) => void;
  onTelemetry: (driverNumber: number, data: any) => void;
  onRaceControl: (msg: any) => void;
  onTeamRadio: (msg: any) => void;
  onPit: (evt: any) => void;
  onTrackStatus: (status: any) => void;
}

export class RedisConsumer {
  private redisSub: Redis;
  private redisStream: Redis;
  private redisKv: Redis;
  private callbacks: ConsumerCallbacks;
  private running = false;

  constructor(callbacks: ConsumerCallbacks) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.redisSub = new Redis(redisUrl);     // For Pub/Sub
    this.redisStream = new Redis(redisUrl);  // For Streams
    this.redisKv = new Redis(redisUrl);      // For KV polling
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    this.running = true;

    // 1. Subscribe to Pub/Sub channels
    await this.redisSub.subscribe(
      "channel:race_control",
      "channel:team_radio",
      "channel:pit",
      "channel:track_status"
    );

    this.redisSub.on("message", (channel, message) => {
      const data = JSON.parse(message);
      switch (channel) {
        case "channel:race_control": this.callbacks.onRaceControl(data); break;
        case "channel:team_radio": this.callbacks.onTeamRadio(data); break;
        case "channel:pit": this.callbacks.onPit(data); break;
        case "channel:track_status": this.callbacks.onTrackStatus(data); break;
      }
    });

    // 2. Poll KV for standings (simpler than streams for state data)
    this.pollKv();

    // 3. Read Streams for positions and telemetry
    this.readPositionStream();
    this.readTelemetryStreams();

    logger.info("Redis consumer started");
  }

  private async pollKv(): Promise<void> {
    while (this.running) {
      try {
        const standings = await this.redisKv.get("live:standings");
        if (standings) this.callbacks.onStandings(JSON.parse(standings));
      } catch (err) {
        logger.error({ err }, "KV poll error");
      }
      await new Promise((r) => setTimeout(r, 500)); // Poll @2Hz
    }
  }

  private async readPositionStream(): Promise<void> {
    let lastId = "$"; // Only new messages
    while (this.running) {
      try {
        const results = await this.redisStream.xread(
          "COUNT", "10", "BLOCK", "200",
          "STREAMS", "stream:positions", lastId
        );
        if (results) {
          for (const [, messages] of results) {
            for (const [id, fields] of messages) {
              lastId = id;
              const data = JSON.parse(fields[1]); // fields = ["data", "{...}"]
              this.callbacks.onPositions(data);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Position stream read error");
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  private async readTelemetryStreams(): Promise<void> {
    // Track which car streams exist and read them
    let lastIds: Record<string, string> = {};
    while (this.running) {
      try {
        // Discover active car streams
        const keys = await this.redisStream.keys("stream:telemetry:car:*");
        for (const key of keys) {
          if (!lastIds[key]) lastIds[key] = "$";
        }

        if (Object.keys(lastIds).length === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        const streams = Object.keys(lastIds);
        const ids = Object.values(lastIds);

        const results = await this.redisStream.xread(
          "COUNT", "20", "BLOCK", "200",
          "STREAMS", ...streams, ...ids
        );

        if (results) {
          for (const [stream, messages] of results) {
            const driverNum = parseInt(stream.split(":").pop()!);
            for (const [id, fields] of messages) {
              lastIds[stream] = id;
              const data = JSON.parse(fields[1]);
              this.callbacks.onTelemetry(driverNum, data);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Telemetry stream read error");
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.redisSub.unsubscribe();
    this.redisSub.disconnect();
    this.redisStream.disconnect();
    this.redisKv.disconnect();
  }
}
```

### 3.5 Throttled Broadcasters

```typescript
// src/throttle.ts
export class ThrottledEmitter<T> {
  private latestData: T | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly emitFn: (data: T) => void,
    private readonly intervalMs: number
  ) {
    this.timer = setInterval(() => this.flush(), intervalMs);
  }

  enqueue(data: T): void {
    this.latestData = data; // Always keep latest, discard stale
  }

  private flush(): void {
    if (this.latestData !== null) {
      this.emitFn(this.latestData);
      this.latestData = null;
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
```

```typescript
// src/broadcasters/standings-broadcaster.ts
import { Server } from "socket.io";
import { ThrottledEmitter } from "../throttle";

export class StandingsBroadcaster {
  private emitter: ThrottledEmitter<any>;

  constructor(io: Server) {
    this.emitter = new ThrottledEmitter(
      (data) => io.to("live:race").emit("standings", data),
      500 // 2Hz
    );
  }

  enqueue(data: any): void {
    this.emitter.enqueue(data);
  }
}
```

```typescript
// src/broadcasters/positions-broadcaster.ts
import { Server } from "socket.io";
import { ThrottledEmitter } from "../throttle";

export class PositionsBroadcaster {
  private emitter: ThrottledEmitter<any>;

  constructor(io: Server) {
    this.emitter = new ThrottledEmitter(
      (data) => io.to("live:map").emit("positions", data),
      200 // 5Hz
    );
  }

  enqueue(data: any): void {
    this.emitter.enqueue(data);
  }
}
```

```typescript
// src/broadcasters/events-broadcaster.ts
import { Server } from "socket.io";

export class EventsBroadcaster {
  constructor(private io: Server) {}

  emitRaceControl(msg: any): void {
    this.io.to("live:events").emit("race_control", msg);
  }

  emitTeamRadio(msg: any): void {
    this.io.to("live:events").emit("team_radio", msg);
  }

  emitPit(evt: any): void {
    this.io.to("live:events").emit("pit", evt);
  }

  emitTrackStatus(status: any): void {
    this.io.to("live:events").emit("track_status", status);
  }
}
```

### 3.6 Mock Replay Server (Development)

```typescript
// src/mock-replay.ts
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import { logger } from "./lib/logger";

interface RecordedFrame {
  timestamp: number;  // ms offset from start
  event: string;      // "standings" | "positions" | "race_control" | etc.
  data: any;
}

export class MockReplay {
  private frames: RecordedFrame[] = [];
  private currentIndex = 0;
  private startTime = 0;
  private timer: NodeJS.Timeout | null = null;
  private speed = 1; // Playback speed multiplier

  constructor(private io: Server) {}

  loadRecording(filePath: string): void {
    const raw = fs.readFileSync(filePath, "utf-8");
    this.frames = JSON.parse(raw);
    logger.info({ frames: this.frames.length, file: filePath }, "Loaded recording");
  }

  start(speed = 1): void {
    this.speed = speed;
    this.currentIndex = 0;
    this.startTime = Date.now();
    this.scheduleNext();
    logger.info({ speed }, "Mock replay started");
  }

  private scheduleNext(): void {
    if (this.currentIndex >= this.frames.length) {
      logger.info("Replay complete, looping...");
      this.currentIndex = 0;
      this.startTime = Date.now();
    }

    const frame = this.frames[this.currentIndex];
    const elapsed = Date.now() - this.startTime;
    const waitMs = Math.max(0, (frame.timestamp / this.speed) - elapsed);

    this.timer = setTimeout(() => {
      // Emit to appropriate room
      switch (frame.event) {
        case "standings":
          this.io.to("live:race").emit("standings", frame.data);
          break;
        case "positions":
          this.io.to("live:map").emit("positions", frame.data);
          break;
        case "race_control":
          this.io.to("live:events").emit("race_control", frame.data);
          break;
        case "team_radio":
          this.io.to("live:events").emit("team_radio", frame.data);
          break;
        case "track_status":
          this.io.to("live:events").emit("track_status", frame.data);
          break;
      }

      this.currentIndex++;
      this.scheduleNext();
    }, waitMs);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
```

**Sample recording format (`recordings/sample-race.json`):**
```json
[
  { "timestamp": 0, "event": "standings", "data": [{"driverNumber": 1, "position": 1, "broadcastName": "VER", "teamColor": "#3671C6", "gapToLeader": "LEADER", "interval": "—"}] },
  { "timestamp": 200, "event": "positions", "data": [{"driverNumber": 1, "x": 1200, "y": 4500, "z": 0}] },
  { "timestamp": 5000, "event": "race_control", "data": {"id": "rcm-1", "lap": 1, "category": "Flag", "flag": "GREEN", "message": "GREEN FLAG - PIT EXIT OPEN"} }
]
```

### 3.7 Connection Metrics

```typescript
// src/metrics.ts
export const metrics = {
  connections: 0,
  messagesPerSecond: 0,
  bytesPerSecond: 0,
  _messageCount: 0,

  startTracking(): void {
    setInterval(() => {
      this.messagesPerSecond = this._messageCount;
      this._messageCount = 0;
    }, 1000);
  },

  recordMessage(): void {
    this._messageCount++;
  },
};
```

### 3.8 Room Architecture Reference

| Room | Content | Frequency | Auto-Join |
|------|---------|-----------|-----------|
| `live:race` | Standings, lap count, weather, track status | 2Hz (500ms) | ✅ All clients |
| `live:map` | All 20 car positions (x/y/z) | 5Hz (200ms) | ❌ On request |
| `live:events` | Race control, team radio, pit, overtakes | On event | ✅ All clients |
| `live:telemetry:car:{N}` | Single car's speed/rpm/gear/throttle/brake/drs | 5Hz (200ms) | ❌ On request |

---

## Acceptance Criteria
- [ ] `pnpm --filter ws-server dev` starts Socket.io on port 3001
- [ ] Client can connect via `io("http://localhost:3001")` and receives standings
- [ ] Room subscriptions work (`subscribe:map`, `subscribe:telemetry`)
- [ ] Standings broadcast at ~2Hz (check with timing logs)
- [ ] Positions broadcast at ~5Hz to `live:map` room only
- [ ] Race control messages arrive instantly via `live:events`
- [ ] Mock replay server loads sample recording and broadcasts data
- [ ] WebSocket compression active (check handshake headers)
- [ ] Connection metrics logged every 10 seconds
- [ ] Graceful disconnect handling (client reconnect works)

## Key Dependencies
```
socket.io ioredis pino cors
tsx (dev runner)
```

import type { Server } from "socket.io";
import Redis from "ioredis";
import { hasOpenF1Credentials, openF1Fetch } from "./lib/openf1-client";
import { findLiveSessionFromJolpica, scheduledSessionToSessionInfo } from "./lib/jolpica";
import {
  DEMO_DRIVERS,
  buildDemoStandings,
  buildDemoPositions,
  buildDemoBootstrap,
} from "./lib/demo-data";
import { StandingsBroadcaster } from "./broadcasters/standings-broadcaster";
import { PositionsBroadcaster } from "./broadcasters/positions-broadcaster";
import { TelemetryBroadcaster } from "./broadcasters/telemetry-broadcaster";
import { EventsBroadcaster } from "./broadcasters/events-broadcaster";
import { logger } from "./lib/logger";

interface LiveFallbackDeps {
  io: Server;
  standingsBroadcaster: StandingsBroadcaster;
  positionsBroadcaster: PositionsBroadcaster;
  telemetryBroadcaster: TelemetryBroadcaster;
  eventsBroadcaster: EventsBroadcaster;
}

export class LiveFallbackPoller {
  private redis: Redis;
  private timer: NodeJS.Timeout | null = null;
  private demoTimer: NodeJS.Timeout | null = null;
  private tick = 0;
  private active = false;
  private deps: LiveFallbackDeps;

  constructor(deps: LiveFallbackDeps, redisUrl?: string) {
    this.deps = deps;
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379");
  }

  start(): void {
    this.checkAndActivate();
    this.timer = setInterval(() => this.checkAndActivate(), 10_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.demoTimer) clearInterval(this.demoTimer);
    this.redis.disconnect();
    this.active = false;
  }

  private async checkAndActivate(): Promise<void> {
    try {
      const standings = await this.redis.get("live:standings");
      if (standings) {
        if (this.active) {
          logger.info("Redis data available — stopping live fallback");
          this.stopDemo();
        }
        return;
      }

      const seasonYear = parseInt(process.env.CURRENT_SEASON || String(new Date().getFullYear()), 10);
      const jolpicaLive = await findLiveSessionFromJolpica(seasonYear);
      if (!jolpicaLive) return;

      if (hasOpenF1Credentials()) {
        await this.pollOpenF1(jolpicaLive);
        return;
      }

      if (!this.active) {
        logger.info(
          { meeting: jolpicaLive.meetingName, session: jolpicaLive.sessionName },
          "Starting demo live fallback (no OpenF1 auth, Redis empty)"
        );
        this.startDemo(scheduledSessionToSessionInfo(jolpicaLive));
      }
    } catch (err) {
      logger.error({ err }, "Live fallback check failed");
    }
  }

  private async pollOpenF1(
    jolpicaLive: Awaited<ReturnType<typeof findLiveSessionFromJolpica>>
  ): Promise<void> {
    if (!jolpicaLive) return;

    const [positions, intervals] = await Promise.all([
      openF1Fetch("position", { session_key: "latest" }),
      openF1Fetch("intervals", { session_key: "latest" }),
    ]);

    if (!positions.ok) return;

    const session = scheduledSessionToSessionInfo(jolpicaLive);
    this.deps.eventsBroadcaster.emitSessionState(session);

    const drivers = await openF1Fetch("drivers", { session_key: "latest" });
    if (drivers.ok && intervals.ok) {
      const standings = buildDemoStandings(0); // placeholder — real data via bootstrap
      this.deps.standingsBroadcaster.enqueue({ standings } as never);
    }

    const location = await openF1Fetch("location", { session_key: "latest" });
    if (location.ok && location.data.length) {
      const latest = new Map<number, { x: number; y: number; z: number }>();
      for (const row of location.data as Array<{
        driver_number: number;
        x: number;
        y: number;
        z: number;
      }>) {
        latest.set(row.driver_number, { x: row.x, y: row.y, z: row.z });
      }
      const positionsPayload = Array.from(latest.entries()).map(([num, pos]) => ({
        driverNumber: num,
        ...pos,
      }));
      if (positionsPayload.length) {
        this.deps.positionsBroadcaster.enqueue(positionsPayload as never);
      }
    }
  }

  private startDemo(session: ReturnType<typeof scheduledSessionToSessionInfo>): void {
    this.active = true;
    const bootstrap = buildDemoBootstrap(session);
    this.deps.eventsBroadcaster.emitSessionState(bootstrap.session!);
    this.deps.eventsBroadcaster.emitTrackStatus(bootstrap.trackStatus as never);
    this.deps.eventsBroadcaster.emitWeather(bootstrap.weather as never);
    this.deps.eventsBroadcaster.emitLap(bootstrap.lap!);
    this.deps.standingsBroadcaster.enqueue({ standings: bootstrap.standings } as never);

    this.demoTimer = setInterval(() => {
      this.tick++;
      this.deps.standingsBroadcaster.enqueue({
        standings: buildDemoStandings(this.tick),
      } as never);
      this.deps.positionsBroadcaster.enqueue(buildDemoPositions(this.tick) as never);

      DEMO_DRIVERS.forEach((d) => {
        this.deps.telemetryBroadcaster.enqueue(d.n, {
          speed: 200 + Math.floor(Math.random() * 120),
          rpm: 10000 + Math.floor(Math.random() * 4000),
          gear: 5 + Math.floor(Math.random() * 3),
          throttle: 50 + Math.floor(Math.random() * 50),
          brake: Math.random() > 0.8,
          drs: Math.random() > 0.7 ? 2 : 0,
        });
      });

      if (this.tick % 8 === 0) {
        this.deps.eventsBroadcaster.emitLap({
          current: Math.floor(this.tick / 8) + 1,
          total: session.totalLaps || 66,
        });
      }
    }, 1000);
  }

  private stopDemo(): void {
    if (this.demoTimer) clearInterval(this.demoTimer);
    this.demoTimer = null;
    this.active = false;
    this.tick = 0;
  }
}

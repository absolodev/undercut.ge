import Redis from "ioredis";
import type { SessionInfo } from "@pitwall/types";
import { logger } from "./lib/logger";

export interface SessionBootstrapPayload {
  session: SessionInfo | null;
  lap: { current: number; total: number } | null;
  trackStatus: { status: string; message?: string } | null;
  weather: Record<string, unknown> | null;
  standings: unknown[] | null;
}

export class SessionBootstrap {
  private redisKv: Redis;

  constructor(redisUrl?: string) {
    this.redisKv = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379");
  }

  async getState(): Promise<SessionBootstrapPayload> {
    const [sessionRaw, lapRaw, trackRaw, weatherRaw, standingsRaw] = await Promise.all([
      this.redisKv.get("live:session:info"),
      this.redisKv.get("live:lap"),
      this.redisKv.get("live:track:status"),
      this.redisKv.get("live:weather"),
      this.redisKv.get("live:standings"),
    ]);

    return {
      session: sessionRaw ? JSON.parse(sessionRaw) : null,
      lap: lapRaw ? JSON.parse(lapRaw) : null,
      trackStatus: trackRaw ? JSON.parse(trackRaw) : null,
      weather: weatherRaw ? JSON.parse(weatherRaw) : null,
      standings: standingsRaw ? JSON.parse(standingsRaw) : null,
    };
  }

  async disconnect(): Promise<void> {
    this.redisKv.disconnect();
  }
}

export async function emitBootstrapToSocket(
  socket: { emit: (event: string, data: unknown) => void },
  bootstrap: SessionBootstrap
): Promise<void> {
  try {
    const state = await bootstrap.getState();
    socket.emit("session_bootstrap", state);
    logger.debug("Session bootstrap sent to client");
  } catch (err) {
    logger.error({ err }, "Failed to send session bootstrap");
  }
}

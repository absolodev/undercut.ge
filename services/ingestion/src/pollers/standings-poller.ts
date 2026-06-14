import { openF1Limiter } from "../lib/rate-limiter";
import { openF1Fetch } from "../lib/openf1-client";
import { logger } from "../lib/logger";
import { normalizeStandings } from "../normalizers/openf1-normalizer";
import { redisKvWriter } from "../writers/redis-kv-writer";

export class StandingsPoller {
  private intervalMs = 1000;
  private timer: NodeJS.Timeout | null = null;
  private sessionKey: number | null = null;
  private driversCache: unknown[] | null = null;

  start(sessionKey: number): void {
    this.sessionKey = sessionKey;
    this.driversCache = null;
    this.tick();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.sessionKey = null;
    this.driversCache = null;
  }

  private async fetchJson(endpoint: string, sessionKey: number): Promise<any[]> {
    await openF1Limiter.acquire();
    const result = await openF1Fetch(endpoint, { session_key: String(sessionKey) });
    return result.ok ? (result.data as any[]) : [];
  }

  private async tick(): Promise<void> {
    const sessionKey = this.sessionKey;
    if (!sessionKey) return;

    try {
      const [positions, intervals] = await Promise.all([
        this.fetchJson("position", sessionKey),
        this.fetchJson("intervals", sessionKey),
      ]);

      if (!this.driversCache?.length) {
        this.driversCache = await this.fetchJson("drivers", sessionKey);
      }

      const stints = await this.fetchJson("stints", sessionKey);
      const standings = normalizeStandings(
        positions,
        intervals,
        this.driversCache as never[],
        stints
      );

      if (standings.length > 0) {
        await redisKvWriter.setStandings(standings);
      }
    } catch (err) {
      logger.error({ err }, "Standings poller error");
    }

    this.timer = setTimeout(() => this.tick(), this.intervalMs);
  }
}

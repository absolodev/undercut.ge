import { openF1Limiter } from "../lib/rate-limiter";
import { openF1Fetch } from "../lib/openf1-client";
import { logger } from "../lib/logger";

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
      const params: Record<string, string> = { session_key: String(sessionKey) };
      if (this.lastTimestamp) params["date>"] = this.lastTimestamp;

      const result = await openF1Fetch(this.endpoint, params);

      if (!result.ok) {
        if (result.restricted) {
          logger.warn({ endpoint: this.endpoint }, "OpenF1 live restriction — poller paused");
          this.backoffMs = Math.min(this.backoffMs * 2 || 5000, this.maxBackoffMs);
        }
      } else {
        const data = result.data as any[];
        if (data.length > 0) {
          this.lastTimestamp = data[data.length - 1].date || new Date().toISOString();
          await this.onData(data, sessionKey);
        }
        this.backoffMs = 0;
      }
    } catch (err) {
      logger.error({ endpoint: this.endpoint, err }, "Poller error");
      this.backoffMs = Math.min(this.backoffMs * 2 || 1000, this.maxBackoffMs);
    }

    this.timer = setTimeout(() => this.tick(sessionKey), this.intervalMs + this.backoffMs);
  }

  protected abstract onData(data: any[], sessionKey: number): Promise<void>;
}

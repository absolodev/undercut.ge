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
        const data = await res.json() as any[];
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

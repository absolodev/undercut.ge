import { LocationPoller } from "./pollers/location-poller";
import { RaceControlPoller } from "./pollers/race-control-poller";
import { WeatherPoller } from "./pollers/weather-poller";
import { StandingsPoller } from "./pollers/standings-poller";
import { LapsPoller } from "./pollers/laps-poller";
import { redisKvWriter } from "./writers/redis-kv-writer";
import { mapOpenF1Session } from "./lib/session-utils";
import { logger } from "./lib/logger";

export class SessionManager {
  private currentSessionKey: number | null = null;
  private lapsPoller = new LapsPoller();
  private pollers = [
    new LocationPoller(),
    new RaceControlPoller(),
    new WeatherPoller(),
    new StandingsPoller(),
    this.lapsPoller,
  ];

  async start(): Promise<void> {
    logger.info("Session manager started, checking for active sessions...");
    this.checkForSession();
    setInterval(() => this.checkForSession(), 30_000);
  }

  private async checkForSession(): Promise<void> {
    try {
      const res = await fetch("https://api.openf1.org/v1/sessions?session_key=latest");
      const sessions = await res.json() as any;

      if (sessions.detail) {
        logger.warn({ detail: sessions.detail }, "OpenF1 API restricted (likely live session in progress without API key)");
        return;
      }

      if (!sessions.length) return;

      const session = sessions[0];

      if (session.session_key !== this.currentSessionKey) {
        logger.info({ sessionKey: session.session_key, name: session.session_name }, "New session detected");
        this.stopPollers();
        this.currentSessionKey = session.session_key;
        await this.publishSessionInfo(session);
        this.startPollers(session.session_key);
      }
    } catch (err) {
      logger.error({ err }, "Failed to check for sessions");
    }
  }

  private async publishSessionInfo(session: Record<string, unknown>): Promise<void> {
    const info = mapOpenF1Session(session);
    await redisKvWriter.setSessionInfo(info);
    this.lapsPoller.setTotalLaps(info.totalLaps);
    if (info.totalLaps > 0) {
      await redisKvWriter.setLapCount(0, info.totalLaps);
    }
    logger.info({ circuit: info.circuitName, type: info.sessionType }, "Session info published to Redis");
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

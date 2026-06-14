import { LocationPoller } from "./pollers/location-poller";
import { RaceControlPoller } from "./pollers/race-control-poller";
import { WeatherPoller } from "./pollers/weather-poller";
import { StandingsPoller } from "./pollers/standings-poller";
import { LapsPoller } from "./pollers/laps-poller";
import { redisKvWriter } from "./writers/redis-kv-writer";
import { mapOpenF1Session } from "./lib/session-utils";
import { openF1Fetch, getOpenF1AccessToken } from "./lib/openf1-client";
import { findLiveSessionFromJolpica, scheduledSessionToSessionInfo } from "./lib/jolpica";
import { logger } from "./lib/logger";

export class SessionManager {
  private currentSessionKey: number | null = null;
  private pollersActive = false;
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
      const seasonYear = parseInt(process.env.CURRENT_SEASON || String(new Date().getFullYear()), 10);
      const result = await openF1Fetch("sessions", { session_key: "latest" });

      if (!result.ok) {
        if (result.restricted) {
          logger.warn("OpenF1 API restricted during live session");
          const jolpicaLive = await findLiveSessionFromJolpica(seasonYear);
          if (jolpicaLive) {
            const info = scheduledSessionToSessionInfo(jolpicaLive);
            await this.publishSessionInfo(info, null);
            if (await getOpenF1AccessToken()) {
              logger.info("OpenF1 credentials available — starting pollers without session key");
            } else {
              logger.info(
                { meeting: info.meetingName, session: info.sessionName },
                "Published Jolpica session info (no OpenF1 auth — pollers idle)"
              );
            }
          }
        }
        return;
      }

      if (!result.data.length) return;

      const session = result.data[0] as Record<string, unknown>;
      const sessionKey = Number(session.session_key);

      if (sessionKey !== this.currentSessionKey) {
        logger.info(
          { sessionKey, name: session.session_name },
          "New session detected"
        );
        this.stopPollers();
        this.currentSessionKey = sessionKey;
        const info = mapOpenF1Session(session);
        await this.publishSessionInfo(info, sessionKey);
        this.startPollers(sessionKey);
      } else if (!this.pollersActive) {
        this.startPollers(sessionKey);
      }
    } catch (err) {
      logger.error({ err }, "Failed to check for sessions");
    }
  }

  private async publishSessionInfo(
    info: ReturnType<typeof mapOpenF1Session>,
    sessionKey: number | null
  ): Promise<void> {
    await redisKvWriter.setSessionInfo(info);
    this.lapsPoller.setTotalLaps(info.totalLaps);
    if (info.totalLaps > 0) {
      await redisKvWriter.setLapCount(0, info.totalLaps);
    }
    logger.info(
      { circuit: info.circuitName, type: info.sessionType, sessionKey },
      "Session info published to Redis"
    );
  }

  private startPollers(sessionKey: number): void {
    for (const poller of this.pollers) {
      poller.start(sessionKey);
    }
    this.pollersActive = true;
  }

  private stopPollers(): void {
    for (const poller of this.pollers) {
      poller.stop();
    }
    this.pollersActive = false;
  }
}

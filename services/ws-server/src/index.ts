import http from "http";
import { createSocketServer } from "./socket-server";
import { RedisConsumer } from "./redis-consumer";
import { StandingsBroadcaster } from "./broadcasters/standings-broadcaster";
import { PositionsBroadcaster } from "./broadcasters/positions-broadcaster";
import { TelemetryBroadcaster } from "./broadcasters/telemetry-broadcaster";
import { EventsBroadcaster } from "./broadcasters/events-broadcaster";
import { SessionBootstrap } from "./session-bootstrap";
import { ResilientSessionBootstrap } from "./resilient-session-bootstrap";
import { MockSessionBootstrap } from "./mock-session-bootstrap";
import { LiveFallbackPoller } from "./live-fallback-poller";
import {
  DEMO_DRIVERS,
  buildDemoStandings,
  buildDemoPositions,
} from "./lib/demo-data";
import { logger } from "./lib/logger";

const PORT = parseInt(process.env.WS_PORT || "3001");

async function main() {
  const httpServer = http.createServer();
  const isMock = process.env.MOCK === "true";
  const sessionBootstrap: SessionBootstrap = isMock
    ? new MockSessionBootstrap()
    : new ResilientSessionBootstrap();
  const io = createSocketServer(httpServer, sessionBootstrap);

  const standingsBroadcaster = new StandingsBroadcaster(io);
  const positionsBroadcaster = new PositionsBroadcaster(io);
  const telemetryBroadcaster = new TelemetryBroadcaster(io);
  const eventsBroadcaster = new EventsBroadcaster(io);

  const consumer = new RedisConsumer({
    onStandings: (data) => standingsBroadcaster.enqueue(data),
    onPositions: (data) => positionsBroadcaster.enqueue(data),
    onTelemetry: (num, data) => telemetryBroadcaster.enqueue(num, data),
    onRaceControl: (msg) => eventsBroadcaster.emitRaceControl(msg),
    onTeamRadio: (msg) => eventsBroadcaster.emitTeamRadio(msg),
    onPit: (evt) => eventsBroadcaster.emitPit(evt),
    onTrackStatus: (status) => eventsBroadcaster.emitTrackStatus(status),
    onSessionState: (session) => eventsBroadcaster.emitSessionState(session),
    onWeather: (weather) => eventsBroadcaster.emitWeather(weather),
    onLap: (lap) => eventsBroadcaster.emitLap(lap),
  });

  let liveFallback: LiveFallbackPoller | null = null;

  if (isMock) {
    logger.info("MOCK MODE ENABLED: Starting mock data generator");
    eventsBroadcaster.emitSessionState({
      sessionKey: 0,
      sessionType: "R",
      sessionName: "Race",
      meetingName: "Mock Grand Prix",
      circuitName: "catalunya",
      circuitShortName: "Barcelona",
      countryName: "Spain",
      dateStart: new Date().toISOString(),
      dateEnd: null,
      totalLaps: 66,
    });

    let tick = 0;
    setInterval(() => {
      tick++;
      standingsBroadcaster.enqueue({ standings: buildDemoStandings(tick) } as never);
      positionsBroadcaster.enqueue(buildDemoPositions(tick) as never);

      DEMO_DRIVERS.forEach((d) => {
        telemetryBroadcaster.enqueue(d.n, {
          speed: 200 + Math.floor(Math.random() * 120),
          rpm: 10000 + Math.floor(Math.random() * 4000),
          gear: 5 + Math.floor(Math.random() * 3),
          throttle: 50 + Math.floor(Math.random() * 50),
          brake: Math.random() > 0.8,
          drs: Math.random() > 0.7 ? 2 : 0,
        });
      });

      if (tick % 5 === 0) eventsBroadcaster.emitTrackStatus({ status: "GREEN" } as never);
      if (tick % 8 === 0) {
        eventsBroadcaster.emitLap({ current: Math.floor(tick / 8) + 1, total: 66 });
      }
    }, 1000);
  } else {
    await consumer.start();
    liveFallback = new LiveFallbackPoller({
      io,
      standingsBroadcaster,
      positionsBroadcaster,
      telemetryBroadcaster,
      eventsBroadcaster,
    });
    liveFallback.start();
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT, mock: isMock }, "WebSocket server running");
  });

  process.on("SIGINT", async () => {
    logger.info("Shutting down ws-server...");
    liveFallback?.stop();
    await consumer.stop();
    await sessionBootstrap.disconnect();
    httpServer.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal error");
  process.exit(1);
});

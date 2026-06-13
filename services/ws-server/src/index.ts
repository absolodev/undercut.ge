import http from "http";
import { createSocketServer } from "./socket-server";
import { RedisConsumer } from "./redis-consumer";
import { StandingsBroadcaster } from "./broadcasters/standings-broadcaster";
import { PositionsBroadcaster } from "./broadcasters/positions-broadcaster";
import { TelemetryBroadcaster } from "./broadcasters/telemetry-broadcaster";
import { EventsBroadcaster } from "./broadcasters/events-broadcaster";
import { SessionBootstrap } from "./session-bootstrap";
import { MockSessionBootstrap } from "./mock-session-bootstrap";
import { logger } from "./lib/logger";

const PORT = parseInt(process.env.WS_PORT || "3001");

async function main() {
  const httpServer = http.createServer();
  const sessionBootstrap =
    process.env.MOCK === "true" ? new MockSessionBootstrap() : new SessionBootstrap();
  const io = createSocketServer(httpServer, sessionBootstrap);

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
    onSessionState: (session) => eventsBroadcaster.emitSessionState(session),
    onWeather: (weather) => eventsBroadcaster.emitWeather(weather),
    onLap: (lap) => eventsBroadcaster.emitLap(lap),
  });

  if (process.env.MOCK === "true") {
    logger.info("MOCK MODE ENABLED: Starting mock data generator");
    const drivers = [
      { n: 1, c: "VER", t: "#3671C6", team: "Red Bull Racing" },
      { n: 11, c: "PER", t: "#3671C6", team: "Red Bull Racing" },
      { n: 16, c: "LEC", t: "#E8002D", team: "Ferrari" },
      { n: 55, c: "SAI", t: "#E8002D", team: "Ferrari" },
      { n: 4, c: "NOR", t: "#FF8000", team: "McLaren" },
      { n: 81, c: "PIA", t: "#FF8000", team: "McLaren" },
      { n: 44, c: "HAM", t: "#27F4D2", team: "Mercedes" },
      { n: 63, c: "RUS", t: "#27F4D2", team: "Mercedes" },
      { n: 14, c: "ALO", t: "#229971", team: "Aston Martin" },
      { n: 18, c: "STR", t: "#229971", team: "Aston Martin" },
      { n: 10, c: "GAS", t: "#0093cc", team: "Alpine" },
      { n: 31, c: "OCO", t: "#0093cc", team: "Alpine" },
      { n: 23, c: "ALB", t: "#64C4FF", team: "Williams" },
      { n: 2, c: "SAR", t: "#64C4FF", team: "Williams" },
      { n: 27, c: "HUL", t: "#B6BABD", team: "Haas" },
      { n: 20, c: "MAG", t: "#B6BABD", team: "Haas" },
      { n: 22, c: "TSU", t: "#6692FF", team: "RB" },
      { n: 3, c: "RIC", t: "#6692FF", team: "RB" },
      { n: 77, c: "BOT", t: "#52e252", team: "Sauber" },
      { n: 24, c: "ZHO", t: "#52e252", team: "Sauber" }
    ];
    let tick = 0;
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
    setInterval(() => {
      tick++;
      const standings = drivers.map((d, i) => ({
        driverNumber: d.n,
        position: i + 1,
        broadcastName: d.c,
        teamName: d.team,
        teamColor: d.t,
        gapToLeader: i === 0 ? "LEADER" : `+${(i * 1.5).toFixed(3)}s`,
        interval: i === 0 ? "" : `+1.500s`,
        lastLapMs: Math.round((80.5 + Math.random()) * 1000),
        sector1Ms: Math.round((28.5 + Math.random()) * 1000),
        sector2Ms: Math.round((32.1 + Math.random()) * 1000),
        sector3Ms: Math.round((20.0 + Math.random()) * 1000),
        sector1Color: "green",
        sector2Color: "purple",
        sector3Color: "yellow",
        compound: ["SOFT", "MEDIUM", "HARD"][i % 3],
        tyreAge: tick % 30,
        pitStops: Math.floor(tick / 20) % 3,
        penalties: [],
        isInPit: false,
        isRetired: false,
        hasFastestLap: i === 0,
      }));
      standingsBroadcaster.enqueue({ standings: standings } as any);

      const positions = drivers.map((d, i) => {
        const angle = (tick * 0.05) - (i * 0.2); 
        return { driverNumber: d.n, x: Math.cos(angle) * 1500, y: Math.sin(angle) * 1500, z: 0 };
      });
      positionsBroadcaster.enqueue(positions as any);

      drivers.forEach((d) => {
        const telemetry = {
          speed: 200 + Math.floor(Math.random() * 120),
          rpm: 10000 + Math.floor(Math.random() * 4000),
          gear: 5 + Math.floor(Math.random() * 3),
          throttle: 50 + Math.floor(Math.random() * 50),
          brake: Math.random() > 0.8,
          drs: Math.random() > 0.7 ? 2 : 0,
        };
        telemetryBroadcaster.enqueue(d.n, telemetry);
      });
      
      if (tick % 5 === 0) eventsBroadcaster.emitTrackStatus({ status: "GREEN" } as any);

      if (tick % 8 === 0) {
        eventsBroadcaster.emitLap({
          current: Math.floor(tick / 8) + 1,
          total: 66,
        });
      }

      if (tick % 10 === 0) {
        eventsBroadcaster.emitRaceControl({
          id: `rc_${tick}`,
          lap: Math.floor(tick / 10) + 1,
          category: "Flag",
          flag: "GREEN",
          message: "TRACK CLEAR - DRS ENABLED",
          timestamp: new Date().toISOString(),
        } as any);
      }

      if (tick % 15 === 0) {
        const randomDriver = drivers[Math.floor(Math.random() * drivers.length)];
        eventsBroadcaster.emitTeamRadio({
          id: `tr_${tick}`,
          driverNumber: randomDriver.n,
          broadcastName: randomDriver.c,
          teamName: randomDriver.team,
          teamColor: randomDriver.t,
          lap: Math.floor(tick / 10) + 1,
          timestamp: new Date().toISOString(),
        } as any);
      }
    }, 1000);
  } else {
    await consumer.start();
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "WebSocket server running");
  });

  process.on("SIGINT", async () => {
    logger.info("Shutting down ws-server...");
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

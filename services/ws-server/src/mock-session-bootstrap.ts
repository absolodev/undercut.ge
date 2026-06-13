import type { SessionBootstrapPayload } from "./session-bootstrap";
import { SessionBootstrap } from "./session-bootstrap";

const MOCK_DRIVERS = [
  { n: 1, c: "VER", t: "#3671C6", team: "Red Bull Racing" },
  { n: 11, c: "PER", t: "#3671C6", team: "Red Bull Racing" },
  { n: 16, c: "LEC", t: "#E8002D", team: "Ferrari" },
  { n: 55, c: "SAI", t: "#E8002D", team: "Ferrari" },
  { n: 4, c: "NOR", t: "#FF8000", team: "McLaren" },
  { n: 81, c: "PIA", t: "#FF8000", team: "McLaren" },
  { n: 44, c: "HAM", t: "#27F4D2", team: "Mercedes" },
  { n: 63, c: "RUS", t: "#27F4D2", team: "Mercedes" },
];

function buildMockStandings() {
  return MOCK_DRIVERS.map((d, i) => ({
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
    sector1Color: "green" as const,
    sector2Color: "purple" as const,
    sector3Color: "yellow" as const,
    compound: "SOFT" as const,
    tyreAge: 12,
    pitStops: 1,
    penalties: [],
    isInPit: false,
    isRetired: false,
    hasFastestLap: i === 0,
  }));
}

export class MockSessionBootstrap extends SessionBootstrap {
  async getState(): Promise<SessionBootstrapPayload> {
    return {
      session: {
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
      },
      lap: { current: 12, total: 66 },
      trackStatus: { status: "GREEN", message: "Track clear" },
      weather: {
        airTemperature: 24,
        trackTemperature: 38,
        humidity: 45,
        pressure: 1012,
        windSpeed: 3.2,
        windDirection: 180,
        rainfall: false,
      },
      standings: buildMockStandings(),
    };
  }
}

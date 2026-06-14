import type { SessionInfo } from "@pitwall/types";

export const DEMO_DRIVERS = [
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
  { n: 24, c: "ZHO", t: "#52e252", team: "Sauber" },
];

export function buildDemoStandings(tick = 0) {
  return DEMO_DRIVERS.map((d, i) => ({
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
    compound: (["SOFT", "MEDIUM", "HARD"] as const)[i % 3],
    tyreAge: tick % 30,
    pitStops: Math.floor(tick / 20) % 3,
    penalties: [],
    isInPit: false,
    isRetired: false,
    hasFastestLap: i === 0,
  }));
}

export function buildDemoPositions(tick: number) {
  return DEMO_DRIVERS.map((d, i) => {
    const angle = tick * 0.05 - i * 0.2;
    return { driverNumber: d.n, x: Math.cos(angle) * 1500, y: Math.sin(angle) * 1500, z: 0 };
  });
}

export function buildDemoBootstrap(session: SessionInfo) {
  const totalLaps = session.totalLaps || 66;
  const elapsedMs = Date.now() - new Date(session.dateStart).getTime();
  const estimatedLap = Math.min(totalLaps, Math.max(1, Math.floor(elapsedMs / 90_000)));

  return {
    session,
    lap: { current: estimatedLap, total: totalLaps },
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
    standings: buildDemoStandings(estimatedLap),
  };
}

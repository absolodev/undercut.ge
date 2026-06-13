import { getSocket } from "@pitwall/socket-client";
import { useStandingsStore, usePositionsStore } from "@pitwall/stores";

let fallbackInterval: NodeJS.Timeout | null = null;
let connectionCheckTimeout: NodeJS.Timeout | null = null;

export function startPollingFallback() {
  if (typeof window === "undefined") return;

  const socket = getSocket();

  const checkConnection = () => {
    if (!socket.connected) {
      console.warn("[WS Fallback] WebSocket is disconnected. Starting local simulation fallback in 10s...");
      connectionCheckTimeout = setTimeout(() => {
        if (!socket.connected) {
          startSimulationFallback();
        }
      }, 10000);
    }
  };

  socket.on("connect", () => {
    console.log("[WS Fallback] WebSocket connected. Stopping fallback.");
    stopFallback();
  });

  socket.on("disconnect", () => {
    checkConnection();
  });

  checkConnection();
}

function startSimulationFallback() {
  if (fallbackInterval) return;
  console.warn("[WS Fallback] WebSocket connection failed. Activating offline client-side simulation.");

  const drivers = [
    { n: 1, c: "VER", t: "#3671C6" }, { n: 11, c: "PER", t: "#3671C6" },
    { n: 16, c: "LEC", t: "#E8002D" }, { n: 55, c: "SAI", t: "#E8002D" },
    { n: 4, c: "NOR", t: "#FF8000" }, { n: 81, c: "PIA", t: "#FF8000" },
    { n: 44, c: "HAM", t: "#27F4D2" }, { n: 63, c: "RUS", t: "#27F4D2" }
  ];

  let tick = 0;
  fallbackInterval = setInterval(() => {
    tick++;
    const standings = drivers.map((d, i) => ({
      driverNumber: d.n,
      position: i + 1,
      broadcastName: d.c,
      teamName: d.c === "VER" || d.c === "PER" ? "Red Bull" : d.c === "LEC" || d.c === "SAI" ? "Ferrari" : "Mercedes",
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
      tyreAge: tick % 30,
      pitStops: Math.floor(tick / 20) % 3,
      penalties: [],
      isInPit: false,
      isRetired: false,
      hasFastestLap: i === 0
    }));

    useStandingsStore.getState().setStandings(standings);

    const positions = drivers.map((d, i) => {
      const angle = (tick * 0.05) - (i * 0.2); 
      return { driverNumber: d.n, x: Math.cos(angle) * 1500, y: Math.sin(angle) * 1500, z: 0 };
    });
    usePositionsStore.getState().setPositions(positions);
  }, 1000);
}

function stopFallback() {
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }
  if (connectionCheckTimeout) {
    clearTimeout(connectionCheckTimeout);
    connectionCheckTimeout = null;
  }
}

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getDefaultWsUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3001";
  const { protocol, hostname, origin } = window.location;
  // Local dev: Next.js on :3000, ws-server on :3001
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:3001`;
  }
  // Production: same origin; nginx proxies /socket.io/ → ws-server
  return origin;
}

export function getSocket(): Socket {
  if (!socket) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || getDefaultWsUrl();
    console.log("[WS] Initializing connection to:", wsUrl);

    socket = io(wsUrl, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => console.log("[WS] Connected:", socket!.id));
    socket.on("disconnect", (reason) => console.log("[WS] Disconnected:", reason));
    socket.on("reconnect_attempt", (n) => console.log("[WS] Reconnecting:", n));
  }
  return socket;
}

export function subscribeToMap(): void {
  getSocket().emit("subscribe:map");
}

export function unsubscribeFromMap(): void {
  getSocket().emit("unsubscribe:map");
}

export function subscribeToTelemetry(driverNumber: number): void {
  getSocket().emit("subscribe:telemetry", driverNumber);
}

export function unsubscribeFromTelemetry(): void {
  getSocket().emit("unsubscribe:telemetry");
}

import { Server } from "socket.io";
import http from "http";
import { logger } from "./lib/logger";
import { metrics } from "./metrics";
import { emitBootstrapToSocket, SessionBootstrap } from "./session-bootstrap";

export function createSocketServer(httpServer: http.Server, bootstrap?: SessionBootstrap): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    // Enable WebSocket compression
    perMessageDeflate: {
      threshold: 1024, // Only compress messages > 1KB
      zlibDeflateOptions: { level: 6 },
    },
    // Transport config
    transports: ["websocket", "polling"],
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    metrics.connections++;
    logger.info({ id: socket.id, total: metrics.connections }, "Client connected");

    if (bootstrap) {
      emitBootstrapToSocket(socket, bootstrap);
    }

    socket.join("live:race");
    socket.join("live:events");

    // Client requests map data (opt-in for bandwidth)
    socket.on("subscribe:map", () => {
      socket.join("live:map");
      logger.debug({ id: socket.id }, "Subscribed to map");
    });

    socket.on("unsubscribe:map", () => {
      socket.leave("live:map");
    });

    // Client requests specific car telemetry
    socket.on("subscribe:telemetry", (driverNumber: number) => {
      // Leave all other telemetry rooms first
      for (const room of socket.rooms) {
        if (room.startsWith("live:telemetry:car:")) socket.leave(room);
      }
      socket.join(`live:telemetry:car:${driverNumber}`);
      logger.debug({ id: socket.id, car: driverNumber }, "Subscribed to car telemetry");
    });

    socket.on("unsubscribe:telemetry", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("live:telemetry:car:")) socket.leave(room);
      }
    });

    socket.on("disconnect", (reason) => {
      metrics.connections--;
      logger.debug({ id: socket.id, reason, total: metrics.connections }, "Client disconnected");
    });
  });

  return io;
}

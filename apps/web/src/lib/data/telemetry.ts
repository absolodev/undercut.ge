import { prisma } from "@pitwall/db";

export async function getAvailableSessions() {
  // Try to find sessions that actually have telemetry data
  // Since telemetry table might be large, we'll just fetch recent sessions for now
  return prisma.f1_sessions.findMany({
    orderBy: { date_start: "desc" },
    take: 10,
    include: {
      race: {
        include: { circuit: true },
      },
    },
  });
}

export async function getTelemetryForLap(sessionId: number, driverId: number, lapNumber: number) {
  return prisma.f1_telemetry.findMany({
    where: { session_id: sessionId, driver_id: driverId, lap_number: lapNumber },
    orderBy: { distance_m: "asc" },
  });
}

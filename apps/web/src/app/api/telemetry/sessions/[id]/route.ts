import { NextResponse } from "next/server";
import { prisma } from "@pitwall/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!sessionId) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const session = await prisma.f1_sessions.findUnique({
    where: { id: sessionId },
    include: {
      race: {
        include: { circuit: { select: { name: true, circuit_ref: true } } },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const drivers = await prisma.$queryRaw<
    Array<{
      driver_id: number;
      driver_ref: string;
      full_name: string;
      broadcast_name: string;
      number: number | null;
      constructor_ref: string;
      constructor_name: string;
      laps: number[];
    }>
  >`
    SELECT
      d.id as driver_id,
      d.driver_ref,
      d.full_name,
      d.broadcast_name,
      d.number,
      c.constructor_ref,
      c.name as constructor_name,
      ARRAY_AGG(DISTINCT t.lap_number ORDER BY t.lap_number) FILTER (WHERE t.lap_number IS NOT NULL) as laps
    FROM f1_telemetry t
    JOIN f1_drivers d ON t.driver_id = d.id
    LEFT JOIN f1_results res ON res.session_id = t.session_id AND res.driver_id = d.id
    LEFT JOIN f1_constructors c ON res.constructor_id = c.id
    WHERE t.session_id = ${sessionId}
    GROUP BY d.id, d.driver_ref, d.full_name, d.broadcast_name, d.number, c.constructor_ref, c.name
    ORDER BY d.number ASC NULLS LAST, d.full_name ASC
  `;

  return NextResponse.json({
    session: {
      id: session.id,
      sessionType: session.session_type,
      sessionName: session.session_name,
      raceName: session.race.race_name,
      seasonYear: session.race.season_year,
      round: session.race.round,
      circuitRef: session.race.circuit.circuit_ref,
      circuitName: session.race.circuit.name,
    },
    drivers: drivers.map((d) => ({
      id: d.driver_id,
      driverRef: d.driver_ref,
      fullName: d.full_name,
      broadcastName: d.broadcast_name,
      number: d.number,
      constructorRef: d.constructor_ref,
      constructorName: d.constructor_name,
      laps: d.laps ?? [],
    })),
  });
}

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
      constructor_ref: string | null;
      constructor_name: string | null;
      laps: Array<{ lap: number; ms: number | null; pit: boolean }> | null;
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
      COALESCE(
        json_agg(
          json_build_object(
            'lap', l.lap_number,
            'ms', l.lap_time_ms,
            'pit', l.is_pit_out_lap
          )
          ORDER BY l.lap_number
        ) FILTER (WHERE l.lap_number IS NOT NULL),
        '[]'::json
      ) as laps
    FROM (
      SELECT DISTINCT driver_id
      FROM f1_telemetry
      WHERE session_id = ${sessionId}
    ) present
    JOIN f1_drivers d ON d.id = present.driver_id
    LEFT JOIN f1_laps l ON l.session_id = ${sessionId} AND l.driver_id = d.id
    LEFT JOIN LATERAL (
      SELECT res.constructor_id
      FROM f1_results res
      JOIN f1_sessions s2 ON s2.id = res.session_id
      WHERE res.driver_id = d.id
        AND s2.race_id = (SELECT race_id FROM f1_sessions WHERE id = ${sessionId})
      ORDER BY CASE WHEN res.session_id = ${sessionId} THEN 0 ELSE 1 END
      LIMIT 1
    ) res ON true
    LEFT JOIN f1_constructors c ON c.id = res.constructor_id
    GROUP BY d.id, d.driver_ref, d.full_name, d.broadcast_name, d.number, c.constructor_ref, c.name
    ORDER BY MIN(l.lap_time_ms) FILTER (WHERE l.lap_time_ms IS NOT NULL AND NOT l.is_pit_out_lap) ASC NULLS LAST,
      d.number ASC NULLS LAST
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
    drivers: drivers.map((driver) => {
      const laps = (typeof driver.laps === "string" ? JSON.parse(driver.laps) : driver.laps) ?? [];
      const timed = laps.filter((lap) => lap.ms && !lap.pit);
      const best = timed.reduce<number | null>((min, lap) => (min == null || (lap.ms ?? Infinity) < min ? lap.ms : min), null);
      return {
        id: driver.driver_id,
        driverRef: driver.driver_ref,
        fullName: driver.full_name,
        broadcastName: driver.broadcast_name,
        number: driver.number,
        constructorRef: driver.constructor_ref,
        constructorName: driver.constructor_name,
        bestLapMs: best,
        laps: laps.map((lap) => lap.lap),
        lapTimes: laps,
      };
    }),
  });
}

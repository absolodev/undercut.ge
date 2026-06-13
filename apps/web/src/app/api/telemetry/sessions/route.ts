import { NextResponse } from "next/server";
import { prisma } from "@pitwall/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await prisma.$queryRaw<
    Array<{
      id: number;
      session_type: string;
      session_name: string | null;
      race_name: string;
      season_year: number;
      round: number;
      circuit_name: string;
      circuit_ref: string;
      telemetry_count: bigint;
    }>
  >`
    SELECT
      s.id,
      s.session_type,
      s.session_name,
      r.race_name,
      r.season_year,
      r.round,
      c.name as circuit_name,
      c.circuit_ref,
      COUNT(t.id) as telemetry_count
    FROM f1_sessions s
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_circuits c ON r.circuit_id = c.id
    JOIN f1_telemetry t ON t.session_id = s.id
    GROUP BY s.id, s.session_type, s.session_name, r.race_name, r.season_year, r.round, c.name, c.circuit_ref
    ORDER BY r.season_year DESC, r.round DESC, s.session_type ASC
  `;

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionType: s.session_type,
      sessionName: s.session_name,
      label: `${s.season_year} R${s.round} ${s.race_name} — ${s.session_name ?? s.session_type}`,
      raceName: s.race_name,
      seasonYear: s.season_year,
      round: s.round,
      circuitName: s.circuit_name,
      circuitRef: s.circuit_ref,
      telemetryCount: Number(s.telemetry_count),
    })),
  });
}

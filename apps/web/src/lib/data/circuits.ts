import type { f1_circuits } from "@pitwall/db";
import { prisma } from "@pitwall/db";
import { CURRENT_SEASON } from "@/lib/config";
import { UI_MIN_SEASON } from "@/lib/season";

export type CircuitListItem = f1_circuits & { raceCount: number };

export async function getAllCircuits(): Promise<CircuitListItem[]> {
  const [circuits, counts] = await Promise.all([
    prisma.f1_circuits.findMany({ orderBy: { name: "asc" } }),
    prisma.f1_races.groupBy({
      by: ["circuit_id"],
      where: { season_year: { gte: UI_MIN_SEASON, lte: CURRENT_SEASON } },
      _count: { _all: true },
    }),
  ]);
  const raceCount = new Map(counts.map((row) => [row.circuit_id, row._count._all]));
  return circuits.map((circuit) => ({ ...circuit, raceCount: raceCount.get(circuit.id) ?? 0 }));
}

export async function getCircuitProfile(circuitRef: string) {
  const circuit = await prisma.f1_circuits.findUnique({
    where: { circuit_ref: circuitRef },
  });
  
  if (!circuit) return null;

  // Most wins at this circuit
  const mostWins = await prisma.$queryRaw`
    SELECT d.id, d.full_name, d.broadcast_name, COUNT(*) as wins
    FROM f1_results res
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_drivers d ON res.driver_id = d.id
    WHERE r.circuit_id = ${circuit.id} AND res.finish_position = 1 AND s.session_type = 'R'
    GROUP BY d.id, d.full_name, d.broadcast_name
    ORDER BY wins DESC LIMIT 5
  `;

  // Race history
  const raceHistory = await prisma.f1_races.findMany({
    where: { circuit_id: circuit.id },
    orderBy: { season_year: "desc" },
    include: {
      sessions: {
        where: { session_type: { in: ["R", "Q"] } },
        include: {
          results: {
            where: { finish_position: 1 },
            include: { driver: true, constructor: true },
          },
          qualifying_results: {
            where: { position: 1 },
            include: {
              driver: { select: { full_name: true } },
              constructor: false,
            },
          },
        },
      },
    },
  });

  // Circuit records (fastest qualifying, fastest race lap)
  const fastestQualifying = await prisma.$queryRaw`
    SELECT d.full_name, r.season_year, MIN(LEAST(qr.q1_time_ms, qr.q2_time_ms, qr.q3_time_ms)) as time_ms
    FROM f1_qualifying_results qr
    JOIN f1_sessions s ON qr.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_drivers d ON qr.driver_id = d.id
    WHERE r.circuit_id = ${circuit.id}
    GROUP BY d.full_name, r.season_year
    ORDER BY time_ms ASC LIMIT 1
  `;

  // Pole position time evolution by year
  const poleEvolution = await prisma.$queryRaw`
    SELECT r.season_year as year,
      MIN(LEAST(qr.q1_time_ms, qr.q2_time_ms, qr.q3_time_ms)) as pole_time_ms
    FROM f1_qualifying_results qr
    JOIN f1_sessions s ON qr.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    WHERE r.circuit_id = ${circuit.id} AND qr.position = 1
    GROUP BY r.season_year
    ORDER BY r.season_year ASC
  `;

  const fastestRaceLap = await prisma.$queryRaw<
    Array<{ full_name: string; season_year: number; time_ms: number | null; speed: number | null }>
  >`
    SELECT d.full_name, r.season_year, res.fastest_lap_time_ms as time_ms, res.fastest_lap_speed as speed
    FROM f1_results res
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_drivers d ON res.driver_id = d.id
    WHERE r.circuit_id = ${circuit.id}
      AND res.fastest_lap = true
      AND s.session_type = 'R'
      AND res.fastest_lap_time_ms IS NOT NULL
    ORDER BY res.fastest_lap_time_ms ASC
    LIMIT 1
  `;

  const latestRace = await prisma.f1_races.findFirst({
    where: { circuit_id: circuit.id },
    orderBy: { race_date: "desc" },
    include: {
      sessions: {
        where: { session_type: "R" },
        include: {
          weather_snapshots: { select: { track_temp: true, rainfall: true } },
        },
      },
    },
  });
  const snapshots = latestRace?.sessions[0]?.weather_snapshots ?? [];
  const temps = snapshots.map((row) => row.track_temp).filter((temp): temp is number => temp != null);
  const latestWeather = snapshots.length
    ? {
        race_name: latestRace?.race_name ?? "",
        year: latestRace?.season_year ?? null,
        track_temp: temps.length ? Math.max(...temps) : null,
        rainfall: snapshots.some((row) => row.rainfall),
      }
    : null;

  return {
    circuit,
    mostWins,
    raceHistory,
    fastestQualifying,
    poleEvolution,
    fastestRaceLap,
    latestWeather,
  };
}

import { prisma } from "@pitwall/db";

export async function getAllCircuits() {
  return prisma.f1_circuits.findMany({
    orderBy: { name: "asc" },
  });
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
        where: { session_type: "R" },
        include: {
          results: {
            where: { finish_position: 1 },
            include: { driver: true, constructor: true },
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

  return { circuit, mostWins, raceHistory, fastestQualifying, poleEvolution };
}

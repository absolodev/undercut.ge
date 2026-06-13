import { prisma } from "@pitwall/db";

const STINT_COMPOUNDS = ["MEDIUM", "HARD", "SOFT", "HARD", "SOFT"] as const;

function deriveStintsFromPitStops(
  pitStops: Array<{ id: number; driver_id: number; lap_number: number; driver: { id: number; broadcast_name: string; last_name: string } }>,
  totalLaps: number,
  driverIds: number[],
) {
  const byDriver = new Map<number, typeof pitStops>();
  for (const stop of pitStops) {
    const list = byDriver.get(stop.driver_id) ?? [];
    list.push(stop);
    byDriver.set(stop.driver_id, list);
  }

  const stints: Array<{
    id: number;
    driver_id: number;
    stint_number: number;
    compound: string;
    start_lap: number;
    end_lap: number | null;
    driver: (typeof pitStops)[number]["driver"];
  }> = [];

  let syntheticId = 1;
  for (const driverId of driverIds) {
    const stops = (byDriver.get(driverId) ?? []).sort((a, b) => a.lap_number - b.lap_number);
    const driver = stops[0]?.driver ?? pitStops.find((p) => p.driver_id === driverId)?.driver;
    if (!driver) continue;

    const boundaries = [1, ...stops.map((s) => s.lap_number + 1), totalLaps + 1];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const startLap = boundaries[i];
      const endLap = boundaries[i + 1] - 1;
      if (startLap > endLap) continue;

      stints.push({
        id: syntheticId++,
        driver_id: driverId,
        stint_number: i + 1,
        compound: STINT_COMPOUNDS[i] ?? "HARD",
        start_lap: startLap,
        end_lap: endLap,
        driver,
      });
    }
  }

  return stints;
}

export async function getRaceArchive(year: number, round: number) {
  const race = await prisma.f1_races.findFirst({
    where: { season_year: year, round },
    include: {
      circuit: true,
      sessions: {
        include: {
          results: {
            orderBy: { finish_position: "asc" },
            include: { driver: true, constructor: true },
          },
          qualifying_results: {
            orderBy: { position: "asc" },
            include: { driver: true, constructor: true },
          },
          laps: {
            orderBy: [{ lap_number: "asc" }, { driver_id: "asc" }],
            include: { driver: true },
          },
          pit_stops: {
            orderBy: { lap_number: "asc" },
            include: { driver: true },
          },
          penalties: {
            orderBy: { lap_number: "asc" },
            include: { driver: true },
          },
          incidents: true,
          race_control_messages: {
            orderBy: { occurred_at: "asc" },
          },
          stints: {
            orderBy: [{ driver_id: "asc" }, { stint_number: "asc" }],
            include: { driver: true },
          },
          weather_snapshots: {
            orderBy: { recorded_at: "asc" },
          },
        },
      },
    },
  });

  if (!race) return null;

  const raceSession = race.sessions.find((s) => s.session_type === "R");
  if (!raceSession) return race;

  let totalLaps = race.total_laps ?? 0;
  if (!totalLaps && raceSession.laps.length > 0) {
    totalLaps = Math.max(...raceSession.laps.map((l) => l.lap_number));
    race.total_laps = totalLaps;
  }
  if (!totalLaps && raceSession.results.length > 0) {
    totalLaps = Math.max(...raceSession.results.map((r) => r.laps));
    race.total_laps = totalLaps;
  }

  if (raceSession.stints.length === 0 && raceSession.pit_stops.length > 0 && totalLaps > 0) {
    const driverIds = [
      ...new Set([
        ...raceSession.results.map((r) => r.driver_id),
        ...raceSession.pit_stops.map((p) => p.driver_id),
      ]),
    ];
    (raceSession as any).stints = deriveStintsFromPitStops(
      raceSession.pit_stops,
      totalLaps,
      driverIds,
    );
  }

  return race;
}

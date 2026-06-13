import { prisma } from "../src/index";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const DELAY_MS = 750;

const STINT_COMPOUNDS = ["MEDIUM", "HARD", "SOFT", "HARD", "SOFT"] as const;

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}


async function fetchJolpicaJson(url: string, maxRetries = 12): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const trimmed = text.trimStart();
      if (!res.ok || trimmed.startsWith("<")) {
        throw new Error(`HTTP ${res.status}: non-JSON response`);
      }
      return JSON.parse(text);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const rateLimited = message.includes("429");
      const wait = rateLimited
        ? Math.min(60_000, 5000 * 2 ** attempt)
        : DELAY_MS * (attempt + 1) * 2;
      console.warn(`  Jolpica retry ${attempt + 1}/${maxRetries} in ${wait}ms`);
      await delay(wait);
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

function parseDurationToMs(duration: string | undefined | null): number {
  if (!duration) return 0;
  const seconds = parseFloat(duration);
  return Number.isNaN(seconds) ? 0 : Math.round(seconds * 1000);
}

function parseLapTimeToMs(time: string | undefined | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
    return Math.round((minutes * 60 + seconds) * 1000);
  }
  const seconds = parseFloat(time);
  return Number.isNaN(seconds) ? null : Math.round(seconds * 1000);
}

function parsePenaltyFromStatus(status: string | null | undefined): {
  penalty_type: string;
  reason: string;
  time_added_sec: number | null;
} | null {
  if (!status) return null;
  const timeMatch = status.match(/^\+(\d+)\s+Seconds?$/i);
  if (timeMatch) {
    const seconds = parseInt(timeMatch[1], 10);
    const penaltyType = seconds <= 5 ? "5_SEC" : "10_SEC";
    return {
      penalty_type: penaltyType,
      reason: status,
      time_added_sec: seconds,
    };
  }
  if (/disqualified/i.test(status)) {
    return { penalty_type: "DSQ", reason: status, time_added_sec: null };
  }
  if (/drive.?through/i.test(status)) {
    return { penalty_type: "DRIVE_THROUGH", reason: status, time_added_sec: null };
  }
  if (/stop.?and.?go/i.test(status)) {
    return { penalty_type: "STOP_GO_10", reason: status, time_added_sec: null };
  }
  return null;
}

async function getRaceSession(year: number, round: number) {
  const race = await prisma.f1_races.findUnique({
    where: { season_year_round: { season_year: year, round } },
  });
  if (!race) return null;

  const session = await prisma.f1_sessions.findFirst({
    where: { race_id: race.id, session_type: "R" },
  });
  if (!session) return null;

  return { race, session };
}

export async function seedPenaltiesFromResults(year: number): Promise<void> {
  console.log(`Seeding penalties from race results for ${year}...`);

  const sessions = await prisma.f1_sessions.findMany({
    where: {
      session_type: "R",
      race: { season_year: year },
    },
    include: {
      results: true,
    },
  });

  for (const session of sessions) {
    for (const result of session.results) {
      const parsed = parsePenaltyFromStatus(result.status);
      if (!parsed) continue;

      const existing = await prisma.f1_penalties.findFirst({
        where: {
          session_id: session.id,
          driver_id: result.driver_id,
          penalty_type: parsed.penalty_type,
        },
      });

      if (existing) {
        await prisma.f1_penalties.update({
          where: { id: existing.id },
          data: {
            reason: parsed.reason,
            time_added_sec: parsed.time_added_sec,
          },
        });
      } else {
        await prisma.f1_penalties.create({
          data: {
            session_id: session.id,
            driver_id: result.driver_id,
            penalty_type: parsed.penalty_type,
            reason: parsed.reason,
            time_added_sec: parsed.time_added_sec,
          },
        });
      }
    }
  }
}

export async function seedPitStopsForRace(year: number, round: number): Promise<void> {
  const ctx = await getRaceSession(year, round);
  if (!ctx) return;

  const existing = await prisma.f1_pit_stops.count({
    where: { session_id: ctx.session.id },
  });
  if (existing > 0) return;

  let offset = 0;
  let total = 1;
  const limit = 100;

  while (offset < total) {
    const data = (await fetchJolpicaJson(
      `${JOLPICA_BASE}/${year}/${round}/pitstops.json?limit=${limit}&offset=${offset}`,
    )) as any;
    if (!data?.MRData) break;

    total = parseInt(data.MRData.total) || 0;
    const race = data.MRData.RaceTable?.Races?.[0];
    if (!race) break;

    for (const stop of race.PitStops ?? []) {
      const driver = await prisma.f1_drivers.findUnique({
        where: { driver_ref: stop.driverId },
      });
      if (!driver) continue;

      await prisma.f1_pit_stops.upsert({
        where: {
          session_id_driver_id_stop_number: {
            session_id: ctx.session.id,
            driver_id: driver.id,
            stop_number: parseInt(stop.stop),
          },
        },
        update: {
          lap_number: parseInt(stop.lap),
          duration_ms: parseDurationToMs(stop.duration),
        },
        create: {
          session_id: ctx.session.id,
          driver_id: driver.id,
          stop_number: parseInt(stop.stop),
          lap_number: parseInt(stop.lap),
          duration_ms: parseDurationToMs(stop.duration),
        },
      });
    }

    offset += limit;
    await delay(DELAY_MS);
  }
}

export async function seedLapsForRace(year: number, round: number): Promise<void> {
  const ctx = await getRaceSession(year, round);
  if (!ctx) return;

  const existing = await prisma.f1_laps.count({
    where: { session_id: ctx.session.id },
  });
  if (existing > 0) return;

  let offset = 0;
  let total = 1;
  const limit = 100;
  let maxLap = ctx.race.total_laps ?? 0;

  while (offset < total) {
    const data = (await fetchJolpicaJson(
      `${JOLPICA_BASE}/${year}/${round}/laps.json?limit=${limit}&offset=${offset}`,
    )) as any;
    if (!data?.MRData) break;

    total = parseInt(data.MRData.total) || 0;
    const race = data.MRData.RaceTable?.Races?.[0];
    if (!race) break;

    for (const lap of race.Laps ?? []) {
      const lapNumber = parseInt(lap.number);
      maxLap = Math.max(maxLap, lapNumber);

      for (const timing of lap.Timings ?? []) {
        const driver = await prisma.f1_drivers.findUnique({
          where: { driver_ref: timing.driverId },
        });
        if (!driver) continue;

        await prisma.f1_laps.upsert({
          where: {
            session_id_driver_id_lap_number: {
              session_id: ctx.session.id,
              driver_id: driver.id,
              lap_number: lapNumber,
            },
          },
          update: {
            position: timing.position ? parseInt(timing.position) : null,
            lap_time_ms: parseLapTimeToMs(timing.time),
          },
          create: {
            session_id: ctx.session.id,
            driver_id: driver.id,
            lap_number: lapNumber,
            position: timing.position ? parseInt(timing.position) : null,
            lap_time_ms: parseLapTimeToMs(timing.time),
          },
        });
      }
    }

    offset += limit;
    await delay(DELAY_MS);
  }

  if (maxLap > 0 && !ctx.race.total_laps) {
    await prisma.f1_races.update({
      where: { id: ctx.race.id },
      data: { total_laps: maxLap },
    });
  }
}

export async function deriveStintsForSession(sessionId: number, totalLaps: number): Promise<void> {
  const existing = await prisma.f1_stints.count({ where: { session_id: sessionId } });
  if (existing > 0) return;

  const pitStops = await prisma.f1_pit_stops.findMany({
    where: { session_id: sessionId },
    orderBy: [{ driver_id: "asc" }, { lap_number: "asc" }],
  });

  const driversWithPits = new Map<number, typeof pitStops>();
  for (const stop of pitStops) {
    const list = driversWithPits.get(stop.driver_id) ?? [];
    list.push(stop);
    driversWithPits.set(stop.driver_id, list);
  }

  const results = await prisma.f1_results.findMany({
    where: { session_id: sessionId },
    select: { driver_id: true, laps: true },
  });

  const driverIds = new Set<number>([
    ...results.map((r) => r.driver_id),
    ...pitStops.map((p) => p.driver_id),
  ]);

  for (const driverId of driverIds) {
    const stops = driversWithPits.get(driverId) ?? [];
    const result = results.find((r) => r.driver_id === driverId);
    const raceLaps = totalLaps || result?.laps || 0;
    if (raceLaps <= 0) continue;

    const boundaries = [1, ...stops.map((s) => s.lap_number + 1), raceLaps + 1];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const startLap = boundaries[i];
      const endLap = boundaries[i + 1] - 1;
      if (startLap > endLap) continue;

      await prisma.f1_stints.create({
        data: {
          session_id: sessionId,
          driver_id: driverId,
          stint_number: i + 1,
          compound: STINT_COMPOUNDS[i] ?? "HARD",
          start_lap: startLap,
          end_lap: endLap,
          total_laps: endLap - startLap + 1,
        },
      });
    }
  }
}

export async function seedStintsForYear(year: number): Promise<void> {
  console.log(`Deriving tire stints for ${year}...`);

  const races = await prisma.f1_races.findMany({
    where: { season_year: year },
    include: {
      sessions: {
        where: { session_type: "R" },
      },
    },
    orderBy: { round: "asc" },
  });

  for (const race of races) {
    const session = race.sessions[0];
    if (!session) continue;

    let totalLaps = race.total_laps ?? 0;
    if (!totalLaps) {
      const maxLap = await prisma.f1_laps.aggregate({
        where: { session_id: session.id },
        _max: { lap_number: true },
      });
      totalLaps = maxLap._max.lap_number ?? 0;
      if (totalLaps > 0) {
        await prisma.f1_races.update({
          where: { id: race.id },
          data: { total_laps: totalLaps },
        });
      }
    }

    if (totalLaps > 0) {
      await deriveStintsForSession(session.id, totalLaps);
    }
  }
}

export async function seedSessionDetailsForYear(year: number): Promise<void> {
  console.log(`Seeding session details for ${year}...`);

  const races = await prisma.f1_races.findMany({
    where: { season_year: year },
    orderBy: { round: "asc" },
    select: { round: true },
  });

  for (const { round } of races) {
    console.log(`  ${year} R${round}: pit stops & laps`);
    try {
      await seedPitStopsForRace(year, round);
      await seedLapsForRace(year, round);
    } catch (err) {
      console.error(`  ${year} R${round} session details failed:`, err);
    }
    await delay(DELAY_MS);
  }

  await seedStintsForYear(year);
  await seedPenaltiesFromResults(year);
}

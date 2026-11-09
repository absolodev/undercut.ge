/**
 * Incremental OpenF1 session facts and Jolpica sprint results.
 *
 *   pnpm --filter @pitwall/db db:sync-session-facts
 *   pnpm --filter @pitwall/db db:sync-session-facts -- --from 2023 --to 2026
 *
 * Default year is CURRENT_SEASON, then the calendar year. One race is a few
 * OpenF1 calls plus about 22 lap requests. The script sleeps between calls.
 *
 * OpenF1 has no 2020–2022 sessions. Those years only rewrite race stints to
 * UNKNOWN (pit windows stay, colours go grey) and, from 2021, load Jolpica sprints.
 * Do not call this as a full seed. Do not delete the database.
 *
 * Gaps, fastest laps, and classification are written by seedRacesAndResults.
 * Refresh a year with:
 *   pnpm --filter @pitwall/db exec tsx prisma/sync-latest.ts 2026
 * Do not run prisma/seed.ts with no arguments.
 */
import { prisma } from "../src/index";
import { deriveStintsForSession } from "./seed-session-details";
import { upsertConstructorFromApi, upsertDriverFromApi } from "./seed";
import {
  assignQualifyingTimes,
  mapJolpicaResult,
  mapOpenF1Lap,
  mapOpenF1Pit,
  mapOpenF1SessionResult,
  mapOpenF1Stint,
  mapRaceControl,
  mapWeather,
  type OpenF1SessionResultInput,
} from "../src/session-facts";

const OPENF1 = "https://api.openf1.org/v1";
const JOLPICA = "https://api.jolpi.ca/ergast/f1";
const SIX_HOURS = 6 * 60 * 60 * 1000;

const NAME_TO_TYPE: Record<string, string> = {
  Race: "R",
  Qualifying: "Q",
  Sprint: "S",
  "Sprint Qualifying": "SQ",
  "Sprint Shootout": "SQ",
  "Practice 1": "FP1",
  "Practice 2": "FP2",
  "Practice 3": "FP3",
};

type OfSession = {
  session_key: number;
  session_name: string;
  date_start: string;
  year: number;
};

type OfDriver = {
  driver_number: number;
  full_name?: string;
  last_name?: string;
  name_acronym?: string;
};

type DbDriver = { id: number; number: number | null; last_name: string; full_name: string };

type Stats = {
  sessionKeys: number;
  stints: number;
  pits: number;
  weather: number;
  raceControl: number;
  laps: number;
  qualiFilled: number;
  sprintRows: number;
  sqRows: number;
  practiceRows: number;
  unknownStints: number;
};

function emptyStats(): Stats {
  return {
    sessionKeys: 0,
    stints: 0,
    pits: 0,
    weather: 0,
    raceControl: 0,
    laps: 0,
    qualiFilled: 0,
    sprintRows: 0,
    sqRows: 0,
    practiceRows: 0,
    unknownStints: 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": "undercut.ge" } });
    if (response.ok) {
      await sleep(350);
      return response.json() as Promise<T>;
    }
    if (response.status === 404 || response.status === 400) {
      await sleep(350);
      return null;
    }
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`${response.status} ${url}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1);
    console.log(`  ${response.status} on ${url}, retrying in ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
  throw new Error(`gave up ${url}`);
}

function lastNameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function sqlInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "NULL";
  return String(Math.trunc(value));
}

async function ensureSpeedColumns(): Promise<void> {
  await prisma.$executeRawUnsafe(`ALTER TABLE f1_laps ADD COLUMN IF NOT EXISTS i1_speed INTEGER`);
  await prisma.$executeRawUnsafe(`ALTER TABLE f1_laps ADD COLUMN IF NOT EXISTS i2_speed INTEGER`);
  await prisma.$executeRawUnsafe(`ALTER TABLE f1_laps ADD COLUMN IF NOT EXISTS st_speed INTEGER`);
}

function makeResolver(drivers: DbDriver[]) {
  const byNumber = new Map<number, DbDriver[]>();
  const byLast = new Map<string, DbDriver>();
  for (const driver of drivers) {
    if (driver.number != null) {
      const list = byNumber.get(driver.number) ?? [];
      list.push(driver);
      byNumber.set(driver.number, list);
    }
    byLast.set(lastNameKey(driver.last_name || driver.full_name), driver);
  }

  return function resolve(
    driverNumber: number,
    lastName?: string | null,
    sessionDriverIds?: Set<number>,
  ): DbDriver | null {
    if (lastName) {
      const named = byLast.get(lastNameKey(lastName));
      if (named && (!sessionDriverIds || sessionDriverIds.size === 0 || sessionDriverIds.has(named.id))) {
        return named;
      }
    }
    const candidates = byNumber.get(driverNumber) ?? [];
    if (sessionDriverIds && sessionDriverIds.size > 0) {
      const inSession = candidates.find((driver) => sessionDriverIds.has(driver.id));
      if (inSession) return inSession;
    }
    if (!lastName && candidates.length === 1) return candidates[0];
    return candidates[0] ?? null;
  };
}

async function sessionDriverIds(raceId: number, sessionId: number): Promise<Set<number>> {
  const [results, qualifying] = await Promise.all([
    prisma.f1_results.findMany({ where: { session_id: sessionId }, select: { driver_id: true } }),
    prisma.f1_qualifying_results.findMany({ where: { session_id: sessionId }, select: { driver_id: true } }),
  ]);
  const ids = new Set([...results, ...qualifying].map((row) => row.driver_id));
  if (ids.size > 0) return ids;
  const entries = await prisma.f1_race_entries.findMany({
    where: { race_id: raceId },
    select: { driver_id: true },
  });
  return new Set(entries.map((row) => row.driver_id));
}

async function constructorFor(raceId: number, driverId: number): Promise<number | null> {
  const entry = await prisma.f1_race_entries.findFirst({
    where: { race_id: raceId, driver_id: driverId },
    select: { constructor_id: true },
  });
  if (entry) return entry.constructor_id;
  const raceResult = await prisma.f1_results.findFirst({
    where: { driver_id: driverId, session: { race_id: raceId, session_type: "R" } },
    select: { constructor_id: true },
  });
  return raceResult?.constructor_id ?? null;
}

async function syncJolpicaSprints(year: number, stats: Stats): Promise<void> {
  if (year < 2021) return;
  const races = await prisma.f1_races.findMany({
    where: { season_year: year },
    orderBy: { round: "asc" },
    include: { sessions: { where: { session_type: "S" } } },
  });

  for (const race of races) {
    if (race.sessions.length === 0) continue;
    const url = `${JOLPICA}/${year}/${race.round}/sprint.json?limit=100`;
    let data: {
      MRData?: { RaceTable?: { Races?: Array<{ SprintResults?: Array<Record<string, unknown>> }> } };
    } | null;
    try {
      data = await fetchJson(url);
    } catch (error) {
      console.log(`  sprint ${year} R${race.round} ${error instanceof Error ? error.message : error}`);
      continue;
    }
    const results = data?.MRData?.RaceTable?.Races?.[0]?.SprintResults ?? [];
    if (results.length === 0) {
      await sleep(200);
      continue;
    }
    const session = race.sessions[0];
    if (!session) {
      console.log(`  no S session for ${year} R${race.round}, skipping ${results.length} sprint rows`);
      await sleep(300);
      continue;
    }
    for (const row of results) {
      const driverData = row.Driver as {
        driverId: string;
        code?: string;
        givenName: string;
        familyName: string;
        permanentNumber?: string;
        dateOfBirth?: string;
        nationality: string;
      };
      const constructorData = row.Constructor as {
        constructorId: string;
        name: string;
        nationality: string;
      };
      const driver = await upsertDriverFromApi(driverData);
      const constructor = await upsertConstructorFromApi(constructorData);
      const mapped = mapJolpicaResult(row as never);
      const grid = row.grid ? parseInt(String(row.grid), 10) : null;
      const number = row.number ? parseInt(String(row.number), 10) : null;
      await prisma.f1_results.upsert({
        where: { session_id_driver_id: { session_id: session.id, driver_id: driver.id } },
        update: { constructor_id: constructor.id, number, grid_position: grid, ...mapped },
        create: {
          session_id: session.id,
          driver_id: driver.id,
          constructor_id: constructor.id,
          number,
          grid_position: grid,
          ...mapped,
        },
      });
      stats.sprintRows += 1;
    }
    console.log(`  sprint ${year} R${race.round}: ${results.length} rows`);
    await sleep(350);
  }
}

async function rewritePreOpenF1Stints(year: number, stats: Stats): Promise<void> {
  const sessions = await prisma.f1_sessions.findMany({
    where: { session_type: "R", race: { season_year: year } },
    include: { race: true },
  });
  let rewritten = 0;
  for (const session of sessions) {
    let totalLaps = session.race.total_laps ?? 0;
    if (!totalLaps) {
      const maxLap = await prisma.f1_laps.aggregate({
        where: { session_id: session.id },
        _max: { lap_number: true },
      });
      totalLaps = maxLap._max.lap_number ?? 0;
    }
    if (totalLaps <= 0) continue;
    const deleted = await prisma.f1_stints.deleteMany({ where: { session_id: session.id } });
    rewritten += deleted.count;
    await deriveStintsForSession(session.id, totalLaps);
  }
  stats.unknownStints += rewritten;
  console.log(`rewrote ${rewritten} pre-OpenF1 stints as UNKNOWN`);
}

async function matchSessionKeys(
  year: number,
  ofSessions: OfSession[],
  stats: Stats,
): Promise<void> {
  const races = await prisma.f1_races.findMany({
    where: { season_year: year },
    include: { sessions: true },
    orderBy: { round: "desc" },
  });

  for (const race of races) {
    for (const session of race.sessions) {
      if (session.session_key != null) continue;
      const match = ofSessions.find((ofSession) => {
        if (NAME_TO_TYPE[ofSession.session_name] !== session.session_type) return false;
        const delta = Math.abs(new Date(ofSession.date_start).getTime() - session.date_start.getTime());
        return delta <= SIX_HOURS;
      });
      if (!match) {
        console.log(`  no OpenF1 match for ${year} R${race.round} ${session.session_type}`);
        continue;
      }
      try {
        await prisma.f1_sessions.update({
          where: { id: session.id },
          data: { session_key: match.session_key },
        });
        session.session_key = match.session_key;
        stats.sessionKeys += 1;
      } catch (error) {
        console.log(
          `  session_key ${match.session_key} clash for ${year} R${race.round} ${session.session_type}, skipping`,
          error instanceof Error ? error.message : "",
        );
      }
    }
  }
}

async function upsertLapRows(
  sessionId: number,
  driverId: number,
  laps: ReturnType<typeof mapOpenF1Lap>[],
): Promise<number> {
  const byLap = new Map<number, ReturnType<typeof mapOpenF1Lap>>();
  for (const lap of laps) {
    if (!lap.lap_number || lap.lap_number < 1) continue;
    const previous = byLap.get(lap.lap_number);
    if (!previous || (previous.lap_time_ms == null && lap.lap_time_ms != null)) {
      byLap.set(lap.lap_number, lap);
    }
  }
  const rows = [...byLap.values()];
  if (rows.length === 0) return 0;

  const values = rows
    .map(
      (lap) =>
        `(${sessionId}, ${driverId}, ${lap.lap_number}, ${sqlInt(lap.lap_time_ms)}, ${sqlInt(lap.sector_1_ms)}, ${sqlInt(lap.sector_2_ms)}, ${sqlInt(lap.sector_3_ms)}, ${lap.is_pit_out_lap ? "true" : "false"}, ${sqlInt(lap.i1_speed)}, ${sqlInt(lap.i2_speed)}, ${sqlInt(lap.st_speed)})`,
    )
    .join(",");

  await prisma.$executeRawUnsafe(`
    INSERT INTO f1_laps (
      session_id, driver_id, lap_number, lap_time_ms,
      sector_1_ms, sector_2_ms, sector_3_ms, is_pit_out_lap,
      i1_speed, i2_speed, st_speed
    )
    VALUES ${values}
    ON CONFLICT (session_id, driver_id, lap_number) DO UPDATE SET
      lap_time_ms = COALESCE(EXCLUDED.lap_time_ms, f1_laps.lap_time_ms),
      sector_1_ms = COALESCE(EXCLUDED.sector_1_ms, f1_laps.sector_1_ms),
      sector_2_ms = COALESCE(EXCLUDED.sector_2_ms, f1_laps.sector_2_ms),
      sector_3_ms = COALESCE(EXCLUDED.sector_3_ms, f1_laps.sector_3_ms),
      is_pit_out_lap = EXCLUDED.is_pit_out_lap,
      i1_speed = COALESCE(EXCLUDED.i1_speed, f1_laps.i1_speed),
      i2_speed = COALESCE(EXCLUDED.i2_speed, f1_laps.i2_speed),
      st_speed = COALESCE(EXCLUDED.st_speed, f1_laps.st_speed)
  `);
  return rows.length;
}

async function syncStints(
  sessionId: number,
  sessionKey: number,
  resolve: ReturnType<typeof makeResolver>,
  allowed: Set<number>,
  stats: Stats,
): Promise<void> {
  const ofDrivers = await fetchJson<OfDriver[]>(`${OPENF1}/drivers?session_key=${sessionKey}`);
  const nameByNumber = new Map((ofDrivers ?? []).map((driver) => [driver.driver_number, driver.last_name ?? driver.full_name]));
  const stints = await fetchJson<Array<{
    driver_number: number;
    stint_number: number;
    compound: string;
    lap_start: number;
    lap_end: number | null;
    tyre_age_at_start: number | null;
  }>>(`${OPENF1}/stints?session_key=${sessionKey}`);
  if (!stints?.length) {
    console.log(`  no stints for session ${sessionId}, leaving existing rows`);
    return;
  }

  const rows = [];
  for (const stint of stints) {
    const driver = resolve(stint.driver_number, nameByNumber.get(stint.driver_number), allowed);
    if (!driver) {
      console.log(`  no driver for stint #${stint.driver_number}`);
      continue;
    }
    try {
      const mapped = mapOpenF1Stint(stint);
      if (mapped.start_lap == null) continue;
      rows.push({
        session_id: sessionId,
        driver_id: driver.id,
        stint_number: mapped.stint_number,
        compound: mapped.compound,
        tyre_age_at_start: mapped.tyre_age_at_start,
        start_lap: mapped.start_lap,
        end_lap: mapped.end_lap,
        total_laps: mapped.total_laps,
      });
    } catch (error) {
      console.log(`  skip stint: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (rows.length === 0) return;
  await prisma.f1_stints.deleteMany({ where: { session_id: sessionId } });
  await prisma.f1_stints.createMany({ data: rows });
  stats.stints += rows.length;
  console.log(`  stints ${rows.length}`);
}

async function syncPits(
  sessionId: number,
  sessionKey: number,
  resolve: ReturnType<typeof makeResolver>,
  allowed: Set<number>,
  stats: Stats,
): Promise<void> {
  const pits = await fetchJson<Array<{
    driver_number: number;
    lap_number: number;
    date?: string;
    stop_duration?: number | null;
    pit_duration?: number | null;
    lane_duration?: number | null;
  }>>(`${OPENF1}/pit?session_key=${sessionKey}`);
  if (!pits?.length) {
    console.log(`  no OpenF1 pits for session ${sessionId}`);
    return;
  }

  const byDriver = new Map<number, typeof pits>();
  for (const pit of pits) {
    const list = byDriver.get(pit.driver_number) ?? [];
    list.push(pit);
    byDriver.set(pit.driver_number, list);
  }

  for (const [driverNumber, list] of byDriver) {
    list.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.lap_number - b.lap_number);
    const driver = resolve(driverNumber, null, allowed);
    if (!driver) {
      console.log(`  no driver for pit #${driverNumber}`);
      continue;
    }
    for (let index = 0; index < list.length; index++) {
      const mapped = mapOpenF1Pit({ ...list[index], driver_number: driverNumber });
      const stopNumber = index + 1;
      const existing = await prisma.f1_pit_stops.findUnique({
        where: {
          session_id_driver_id_stop_number: {
            session_id: sessionId,
            driver_id: driver.id,
            stop_number: stopNumber,
          },
        },
      });
      if (existing && Math.abs(existing.lap_number - mapped.lap_number) > 1) {
        console.log(
          `  pit lap mismatch driver ${driver.id} stop ${stopNumber}: stored ${existing.lap_number}, OpenF1 ${mapped.lap_number}`,
        );
      }
      const update: { duration_ms?: number; pit_lane_time_ms?: number | null } = {};
      if (mapped.duration_ms !== undefined) update.duration_ms = mapped.duration_ms;
      if (mapped.pit_lane_time_ms != null) update.pit_lane_time_ms = mapped.pit_lane_time_ms;
      if (existing) {
        if (Object.keys(update).length > 0) {
          await prisma.f1_pit_stops.update({ where: { id: existing.id }, data: update });
          stats.pits += 1;
        }
      } else {
        const duration = mapped.duration_ms ?? mapped.pit_lane_time_ms;
        if (duration == null) continue;
        await prisma.f1_pit_stops.create({
          data: {
            session_id: sessionId,
            driver_id: driver.id,
            stop_number: stopNumber,
            lap_number: mapped.lap_number,
            duration_ms: duration,
            pit_lane_time_ms: mapped.pit_lane_time_ms,
          },
        });
        stats.pits += 1;
      }
    }
  }
}

async function syncWeather(sessionId: number, sessionKey: number, stats: Stats): Promise<void> {
  const rows = await fetchJson<Array<Parameters<typeof mapWeather>[0]>>(
    `${OPENF1}/weather?session_key=${sessionKey}`,
  );
  if (!rows?.length) return;
  for (const row of rows) {
    const mapped = mapWeather(row);
    if (Number.isNaN(mapped.recorded_at.getTime())) continue;
    await prisma.f1_weather_snapshots.upsert({
      where: {
        session_id_recorded_at: { session_id: sessionId, recorded_at: mapped.recorded_at },
      },
      update: {
        air_temp: mapped.air_temp,
        track_temp: mapped.track_temp,
        humidity: mapped.humidity,
        pressure: mapped.pressure,
        wind_speed: mapped.wind_speed,
        wind_direction: mapped.wind_direction,
        rainfall: mapped.rainfall,
      },
      create: { session_id: sessionId, ...mapped },
    });
    stats.weather += 1;
  }
}

async function syncRaceControl(
  sessionId: number,
  sessionKey: number,
  resolve: ReturnType<typeof makeResolver>,
  allowed: Set<number>,
  stats: Stats,
): Promise<Array<{ date: string; qualifying_phase: number | null }>> {
  const rows = await fetchJson<Array<{
    date: string;
    category?: string | null;
    flag?: string | null;
    message?: string | null;
    lap_number?: number | null;
    driver_number?: number | null;
    sector?: number | null;
    qualifying_phase?: number | null;
  }>>(`${OPENF1}/race_control?session_key=${sessionKey}`);
  if (!rows?.length) return [];

  const data = rows
    .filter((row) => row.date && !Number.isNaN(new Date(row.date).getTime()))
    .map((row) => {
      const mapped = mapRaceControl(row);
      const driver = mapped.driver_number == null ? null : resolve(mapped.driver_number, null, allowed);
      return {
        session_id: sessionId,
        occurred_at: mapped.occurred_at,
        category: mapped.category,
        flag_status: mapped.flag_status,
        message: mapped.message,
        lap_number: mapped.lap_number,
        driver_id: driver?.id ?? null,
        sector: mapped.sector,
      };
    });

  await prisma.$transaction([
    prisma.f1_race_control_messages.deleteMany({ where: { session_id: sessionId } }),
    prisma.f1_race_control_messages.createMany({ data }),
  ]);
  stats.raceControl += data.length;
  return rows.map((row) => ({
    date: row.date,
    qualifying_phase: row.qualifying_phase ?? null,
  }));
}

async function syncLaps(
  sessionId: number,
  sessionKey: number,
  resolve: ReturnType<typeof makeResolver>,
  allowed: Set<number>,
  stats: Stats,
): Promise<Array<{ driver_number: number; date_start: string; lap_duration: number | null }>> {
  const ofDrivers = await fetchJson<OfDriver[]>(`${OPENF1}/drivers?session_key=${sessionKey}`);
  const collected: Array<{ driver_number: number; date_start: string; lap_duration: number | null }> = [];
  for (const ofDriver of ofDrivers ?? []) {
    const driver = resolve(ofDriver.driver_number, ofDriver.last_name || ofDriver.full_name, allowed);
    if (!driver) {
      console.log(`  no DB driver for #${ofDriver.driver_number} ${ofDriver.full_name ?? ""}`);
      continue;
    }
    const laps = await fetchJson<Array<{
      driver_number: number;
      lap_number: number;
      date_start?: string | null;
      lap_duration?: number | null;
      duration_sector_1?: number | null;
      duration_sector_2?: number | null;
      duration_sector_3?: number | null;
      i1_speed?: number | null;
      i2_speed?: number | null;
      st_speed?: number | null;
      is_pit_out_lap?: boolean | null;
    }>>(`${OPENF1}/laps?session_key=${sessionKey}&driver_number=${ofDriver.driver_number}`);
    if (!laps?.length) continue;
    const mapped = laps.map((lap) => mapOpenF1Lap(lap));
    stats.laps += await upsertLapRows(sessionId, driver.id, mapped);
    for (const lap of laps) {
      if (!lap.date_start) continue;
      collected.push({
        driver_number: ofDriver.driver_number,
        date_start: lap.date_start,
        lap_duration: lap.lap_duration ?? null,
      });
    }
  }
  return collected;
}

async function fillQualifyingTimes(
  sessionId: number,
  messages: Array<{ date: string; qualifying_phase: number | null }>,
  laps: Array<{ driver_number: number; date_start: string; lap_duration: number | null }>,
  resolve: ReturnType<typeof makeResolver>,
  allowed: Set<number>,
  stats: Stats,
): Promise<void> {
  const times = assignQualifyingTimes({ messages, laps });
  if (times.length === 0) return;
  for (const row of times) {
    const driver = resolve(row.driver_number, null, allowed);
    if (!driver) continue;
    const existing = await prisma.f1_qualifying_results.findUnique({
      where: { session_id_driver_id: { session_id: sessionId, driver_id: driver.id } },
    });
    if (!existing) continue;
    const data: { q1_time_ms?: number; q2_time_ms?: number; q3_time_ms?: number } = {};
    if (existing.q1_time_ms == null && row.q1_time_ms != null) data.q1_time_ms = row.q1_time_ms;
    if (existing.q2_time_ms == null && row.q2_time_ms != null) data.q2_time_ms = row.q2_time_ms;
    if (existing.q3_time_ms == null && row.q3_time_ms != null) data.q3_time_ms = row.q3_time_ms;
    if (Object.keys(data).length === 0) continue;
    await prisma.f1_qualifying_results.update({ where: { id: existing.id }, data });
    stats.qualiFilled += 1;
  }
}

async function syncSessionResult(
  raceId: number,
  sessionId: number,
  sessionKey: number,
  resolve: ReturnType<typeof makeResolver>,
  allowed: Set<number>,
  kind: "sq" | "practice",
  stats: Stats,
): Promise<void> {
  const rows = await fetchJson<OpenF1SessionResultInput[]>(
    `${OPENF1}/session_result?session_key=${sessionKey}`,
  );
  if (!rows?.length) return;
  const ofDrivers = await fetchJson<OfDriver[]>(`${OPENF1}/drivers?session_key=${sessionKey}`);
  const nameByNumber = new Map((ofDrivers ?? []).map((driver) => [driver.driver_number, driver.last_name ?? driver.full_name]));
  let written = 0;
  for (const row of rows) {
    if (row.driver_number == null) continue;
    const driver = resolve(row.driver_number, nameByNumber.get(row.driver_number), allowed);
    if (!driver) continue;
    const constructorId = await constructorFor(raceId, driver.id);
    if (constructorId == null) {
      console.log(`  no constructor for driver ${driver.id} on session ${sessionId}`);
      continue;
    }
    const mapped = mapOpenF1SessionResult(row);
    await prisma.f1_results.upsert({
      where: { session_id_driver_id: { session_id: sessionId, driver_id: driver.id } },
      update: { constructor_id: constructorId, ...mapped },
      create: {
        session_id: sessionId,
        driver_id: driver.id,
        constructor_id: constructorId,
        ...mapped,
      },
    });
    written += 1;
  }
  if (kind === "sq") stats.sqRows += written;
  else stats.practiceRows += written;
  if (written) console.log(`  ${kind} results ${written}`);
}

async function syncOpenF1Year(year: number, stats: Stats, roundFilter?: number): Promise<void> {
  const ofSessions = await fetchJson<OfSession[]>(`${OPENF1}/sessions?year=${year}`);
  if (!ofSessions?.length) {
    console.log(`  OpenF1 returned no sessions for ${year}`);
    return;
  }
  await matchSessionKeys(year, ofSessions, stats);

  const dbDrivers = await prisma.f1_drivers.findMany({
    select: { id: true, number: true, last_name: true, full_name: true },
  });
  const resolve = makeResolver(dbDrivers);

  const races = await prisma.f1_races.findMany({
    where: { season_year: year, ...(roundFilter ? { round: roundFilter } : {}) },
    include: { sessions: true },
    orderBy: { round: "desc" },
  });

  for (const race of races) {
    if (race.race_date.getTime() > Date.now()) {
      console.log(`— ${year} R${race.round} ${race.race_name} not raced yet, skipping OpenF1`);
      continue;
    }
    console.log(`— ${year} R${race.round} ${race.race_name}`);
    const byType = new Map(race.sessions.map((session) => [session.session_type, session]));
    const raceSession = byType.get("R");
    if (raceSession?.session_key) {
      const allowed = await sessionDriverIds(race.id, raceSession.id);
      await syncStints(raceSession.id, raceSession.session_key, resolve, allowed, stats);
      await syncPits(raceSession.id, raceSession.session_key, resolve, allowed, stats);
    }

    let qualiMessages: Array<{ date: string; qualifying_phase: number | null }> = [];
    let qualiLaps: Array<{ driver_number: number; date_start: string; lap_duration: number | null }> = [];

    for (const type of ["Q", "S", "SQ", "R"] as const) {
      const session = byType.get(type);
      if (!session?.session_key) continue;
      const allowed = await sessionDriverIds(race.id, session.id);
      await syncWeather(session.id, session.session_key, stats);
      const messages = await syncRaceControl(session.id, session.session_key, resolve, allowed, stats);
      if (type === "Q") qualiMessages = messages;
      if (type === "Q" || type === "S" || type === "R") {
        const laps = await syncLaps(session.id, session.session_key, resolve, allowed, stats);
        if (type === "Q") qualiLaps = laps;
      }
    }

    const quali = byType.get("Q");
    if (quali) {
      const allowed = await sessionDriverIds(race.id, quali.id);
      await fillQualifyingTimes(quali.id, qualiMessages, qualiLaps, resolve, allowed, stats);
    }

    const sprintQuali = byType.get("SQ");
    if (sprintQuali?.session_key) {
      const allowed = await sessionDriverIds(race.id, sprintQuali.id);
      await syncSessionResult(race.id, sprintQuali.id, sprintQuali.session_key, resolve, allowed, "sq", stats);
    }

    for (const type of ["FP1", "FP2", "FP3"]) {
      const session = byType.get(type);
      if (!session?.session_key) continue;
      const allowed = await sessionDriverIds(race.id, session.id);
      await syncSessionResult(race.id, session.id, session.session_key, resolve, allowed, "practice", stats);
    }
  }
}

export async function syncSessionFacts(options: {
  year?: number;
  from?: number;
  to?: number;
  round?: number;
} = {}): Promise<Stats> {
  await ensureSpeedColumns();
  const fallback = parseInt(process.env.CURRENT_SEASON ?? String(new Date().getFullYear()), 10);
  const from = options.from ?? options.year ?? fallback;
  const to = options.to ?? options.year ?? from;
  const stats = emptyStats();

  for (let year = to; year >= from; year--) {
    if (year < 2020 || year > 2026) {
      console.log(`skip ${year}: outside 2020–2026`);
      continue;
    }
    console.log(`\n=== session facts ${year} ===`);
    await syncJolpicaSprints(year, stats);
    if (year <= 2022) {
      if (!options.round) await rewritePreOpenF1Stints(year, stats);
      continue;
    }
    await syncOpenF1Year(year, stats, options.round);
  }

  console.log(
    `session facts summary: keys ${stats.sessionKeys}, stints ${stats.stints}, pits ${stats.pits}, weather ${stats.weather}, race control ${stats.raceControl}, laps ${stats.laps}, quali filled ${stats.qualiFilled}, sprint ${stats.sprintRows}, sprint quali ${stats.sqRows}, practice ${stats.practiceRows}, unknown stints removed ${stats.unknownStints}`,
  );
  return stats;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let from: number | undefined;
  let to: number | undefined;
  let round: number | undefined;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--from") from = parseInt(args[++index] ?? "", 10);
    else if (args[index] === "--to") to = parseInt(args[++index] ?? "", 10);
    else if (args[index] === "--round") round = parseInt(args[++index] ?? "", 10);
  }
  return { from, to, round };
}

const isDirect = process.argv[1]?.includes("sync-session-facts");
if (isDirect) {
  const { from, to, round } = parseArgs();
  syncSessionFacts({ from, to, round })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

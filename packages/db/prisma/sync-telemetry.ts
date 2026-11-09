/**
 * Replace placeholder telemetry with OpenF1 car data for the latest completed meeting.
 * Qualifying and the race, every driver, downsampled so braking and gear changes stay.
 *
 *   pnpm --filter @pitwall/db db:sync-telemetry
 */
import { prisma } from "../src/index";

const OPENF1 = "https://api.openf1.org/v1";
const WANTED = new Set(["Qualifying", "Race", "Sprint", "Sprint Qualifying"]);
const SESSION_TYPE: Record<string, string> = {
  Qualifying: "Q",
  Race: "R",
  Sprint: "S",
  "Sprint Qualifying": "SQ",
};

type OfSession = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  date_start: string;
  year: number;
  circuit_short_name: string;
};

type OfLap = {
  driver_number: number;
  lap_number: number;
  date_start: string;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
};

type OfSample = {
  date: string;
  driver_number: number;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  drs: number | null;
  rpm: number | null;
};

type OfDriver = {
  driver_number: number;
  full_name: string;
  last_name: string;
  name_acronym: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": "undercut.ge" } });
    if (response.ok) {
      await sleep(350);
      return response.json() as Promise<T>;
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

async function ensureBrakeScale(): Promise<void> {
  const columns = await prisma.$queryRaw<Array<{ data_type: string }>>`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'f1_telemetry' AND column_name = 'brake'
  `;
  if (columns[0]?.data_type === "boolean") {
    console.log("Converting brake from boolean to 0–100 pressure…");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE f1_telemetry
      ALTER COLUMN brake TYPE integer
      USING CASE WHEN brake IS NULL THEN NULL WHEN brake THEN 100 ELSE 0 END
    `);
  }
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS f1_telemetry_session_driver_lap_idx
    ON f1_telemetry (session_id, driver_id, lap_number)
  `);
}

function downsample(points: Array<{ date: string; speed: number; throttle: number; brake: number; gear: number; drs: number; rpm: number | null; distance: number }>) {
  const kept = [];
  let last = -1;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const prev = kept[kept.length - 1];
    const brakeEdge = prev && (prev.brake > 5) !== (point.brake > 5);
    const gearEdge = prev && prev.gear !== point.gear;
    const far = !prev || point.distance - prev.distance >= 12;
    if (i === 0 || i === points.length - 1 || brakeEdge || gearEdge || far) {
      kept.push(point);
      last = i;
    }
  }
  return last >= 0 ? kept : points;
}

function buildLapPoints(samples: OfSample[], laps: OfLap[]) {
  const ordered = [...samples].sort((a, b) => a.date.localeCompare(b.date));
  const windows = [...laps]
    .filter((lap) => lap.date_start)
    .sort((a, b) => a.lap_number - b.lap_number)
    .map((lap, index, all) => ({
      lap: lap.lap_number,
      start: new Date(lap.date_start).getTime(),
      end: all[index + 1] ? new Date(all[index + 1].date_start).getTime() : Number.POSITIVE_INFINITY,
    }));

  const byLap = new Map<number, OfSample[]>();
  for (const sample of ordered) {
    const time = new Date(sample.date).getTime();
    const window = windows.find((item) => time >= item.start && time < item.end);
    if (!window) continue;
    const bucket = byLap.get(window.lap) ?? [];
    bucket.push(sample);
    byLap.set(window.lap, bucket);
  }

  const rows: Array<{
    lap: number;
    date: string;
    speed: number;
    throttle: number;
    brake: number;
    gear: number;
    drs: number;
    rpm: number | null;
    distance: number;
  }> = [];

  for (const [lap, bucket] of byLap) {
    let distance = 0;
    const withDistance = bucket.map((sample, index) => {
      if (index > 0) {
        const dt = (new Date(sample.date).getTime() - new Date(bucket[index - 1].date).getTime()) / 1000;
        const speed = ((sample.speed + bucket[index - 1].speed) / 2) / 3.6;
        if (dt > 0 && dt < 2) distance += speed * dt;
      }
      return {
        lap,
        date: sample.date,
        speed: sample.speed,
        throttle: Math.round(sample.throttle ?? 0),
        brake: Math.round(sample.brake ?? 0),
        gear: sample.n_gear ?? 0,
        drs: sample.drs ?? 0,
        rpm: sample.rpm,
        distance,
      };
    });
    rows.push(...downsample(withDistance));
  }

  return rows;
}

async function syncSession(ofSession: OfSession, sessionId: number, onlyIfMissing: boolean): Promise<number> {
  const existing = await prisma.f1_telemetry.count({ where: { session_id: sessionId } });
  if (onlyIfMissing && existing > 1000) {
    console.log(`  ${ofSession.session_name} already has ${existing} samples, skipping`);
    return existing;
  }

  const [ofDrivers, dbDrivers] = await Promise.all([
    fetchJson<OfDriver[]>(`${OPENF1}/drivers?session_key=${ofSession.session_key}`),
    prisma.f1_drivers.findMany({
      select: { id: true, number: true, full_name: true, last_name: true },
    }),
  ]);

  const byNumber = new Map(dbDrivers.filter((d) => d.number != null).map((d) => [d.number as number, d]));
  const byLast = new Map(dbDrivers.map((d) => [lastNameKey(d.last_name || d.full_name), d]));

  let inserted = 0;
  for (const ofDriver of ofDrivers) {
    const driver =
      byNumber.get(ofDriver.driver_number) ??
      byLast.get(lastNameKey(ofDriver.last_name || ofDriver.full_name));
    if (!driver) {
      console.log(`  no DB driver for #${ofDriver.driver_number} ${ofDriver.full_name}`);
      continue;
    }

    const already = await prisma.f1_telemetry.count({
      where: { session_id: sessionId, driver_id: driver.id },
    });
    if (already > 100) {
      console.log(`  #${ofDriver.driver_number} ${ofDriver.name_acronym} already stored (${already})`);
      inserted += already;
      continue;
    }

    const laps = await fetchJson<OfLap[]>(
      `${OPENF1}/laps?session_key=${ofSession.session_key}&driver_number=${ofDriver.driver_number}`
    );
    const samples = await fetchJson<OfSample[]>(
      `${OPENF1}/car_data?session_key=${ofSession.session_key}&driver_number=${ofDriver.driver_number}`
    );

    await prisma.f1_telemetry.deleteMany({ where: { session_id: sessionId, driver_id: driver.id } });
    for (const lap of laps) {
      const timing = {
        is_pit_out_lap: Boolean(lap.is_pit_out_lap),
        ...(lap.lap_duration ? { lap_time_ms: Math.round(lap.lap_duration * 1000) } : {}),
        ...(lap.duration_sector_1 ? { sector_1_ms: Math.round(lap.duration_sector_1 * 1000) } : {}),
        ...(lap.duration_sector_2 ? { sector_2_ms: Math.round(lap.duration_sector_2 * 1000) } : {}),
        ...(lap.duration_sector_3 ? { sector_3_ms: Math.round(lap.duration_sector_3 * 1000) } : {}),
        ...(lap.i1_speed != null ? { i1_speed: Math.round(lap.i1_speed) } : {}),
        ...(lap.i2_speed != null ? { i2_speed: Math.round(lap.i2_speed) } : {}),
        ...(lap.st_speed != null ? { st_speed: Math.round(lap.st_speed) } : {}),
      };
      await prisma.f1_laps.upsert({
        where: {
          session_id_driver_id_lap_number: {
            session_id: sessionId,
            driver_id: driver.id,
            lap_number: lap.lap_number,
          },
        },
        update: timing,
        create: {
          session_id: sessionId,
          driver_id: driver.id,
          lap_number: lap.lap_number,
          position: null,
          ...timing,
        },
      });
    }

    const points = buildLapPoints(samples, laps);
    for (let i = 0; i < points.length; i += 2000) {
      const chunk = points.slice(i, i + 2000);
      await prisma.f1_telemetry.createMany({
        data: chunk.map((point) => ({
          session_id: sessionId,
          driver_id: driver.id,
          timestamp: new Date(point.date),
          lap_number: point.lap,
          distance_m: Math.round(point.distance * 10) / 10,
          speed: Math.round(point.speed),
          rpm: point.rpm,
          gear: point.gear,
          throttle: point.throttle,
          brake: point.brake,
          drs: point.drs,
        })),
      });
    }
    inserted += points.length;
    console.log(`  #${ofDriver.driver_number} ${ofDriver.name_acronym} ${laps.length} laps, ${points.length} samples`);
  }

  return inserted;
}

export async function syncOpenF1Telemetry(options: { onlyIfMissing?: boolean } = {}): Promise<void> {
  const onlyIfMissing = options.onlyIfMissing ?? process.argv.includes("--if-missing");
  await ensureBrakeScale();

  const races = await fetchJson<OfSession[]>(`${OPENF1}/sessions?year=${new Date().getFullYear()}&session_name=Race`);
  const completed = races
    .filter((session) => new Date(session.date_start).getTime() < Date.now() - 3 * 60 * 60 * 1000)
    .sort((a, b) => a.date_start.localeCompare(b.date_start));
  const latest = completed[completed.length - 1];
  if (!latest) {
    console.log("No completed OpenF1 race to sync.");
    return;
  }

  const meeting = await fetchJson<OfSession[]>(`${OPENF1}/sessions?meeting_key=${latest.meeting_key}`);
  const wanted = meeting.filter((session) => WANTED.has(session.session_name));
  const raceStart = new Date(latest.date_start);
  const race = await prisma.f1_races.findFirst({
    where: {
      season_year: latest.year,
      race_date: {
        gte: new Date(raceStart.getTime() - 36 * 60 * 60 * 1000),
        lte: new Date(raceStart.getTime() + 36 * 60 * 60 * 1000),
      },
    },
    include: { sessions: true, circuit: true },
  });

  if (!race) {
    console.log(`No local race matching OpenF1 ${latest.circuit_short_name} ${latest.date_start}`);
    return;
  }

  console.log(`Telemetry sync: ${race.race_name} (${race.circuit.circuit_ref})`);
  const kept: number[] = [];
  for (const ofSession of wanted) {
    const sessionType = SESSION_TYPE[ofSession.session_name];
    const local = race.sessions.find((session) => session.session_type === sessionType);
    if (!local) {
      console.log(`  missing local session ${sessionType}`);
      continue;
    }
    console.log(`Session ${ofSession.session_name} → ${local.id}`);
    const count = await syncSession(ofSession, local.id, onlyIfMissing);
    if (count > 0) kept.push(local.id);
  }

  if (kept.length) {
    const removed = await prisma.f1_telemetry.deleteMany({
      where: { session_id: { notIn: kept } },
    });
    console.log(`Removed ${removed.count} telemetry rows from other sessions.`);
  }
}

const isDirect = process.argv[1]?.includes("sync-telemetry");
if (isDirect) {
  syncOpenF1Telemetry()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

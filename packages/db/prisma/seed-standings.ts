import { prisma } from "../src/index";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const DELAY_MS = 750;

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}


function parseStandingPosition(row: {
  position?: string;
  positionText?: string;
}): number | null {
  if (row.position) {
    const pos = parseInt(row.position, 10);
    if (!Number.isNaN(pos)) return pos;
  }
  const text = row.positionText;
  if (text && text !== "-" && /^\d+$/.test(text)) {
    return parseInt(text, 10);
  }
  return null;
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

export async function seedStandingsForYear(year: number): Promise<void> {
  console.log(`Seeding standings for ${year}...`);

  const races = await prisma.f1_races.findMany({
    where: { season_year: year },
    orderBy: { round: "asc" },
  });

  for (const race of races) {
    const driverData = await fetchJolpicaJson(
      `${JOLPICA_BASE}/${year}/${race.round}/driverStandings.json`,
    );
    const driverRows =
      driverData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];

    for (const row of driverRows) {
      const driver = await prisma.f1_drivers.findUnique({
        where: { driver_ref: row.Driver.driverId },
      });
      if (!driver) continue;

      const position = parseStandingPosition(row);
      if (position === null) continue;

      await prisma.f1_driver_standings.upsert({
        where: {
          race_id_driver_id: { race_id: race.id, driver_id: driver.id },
        },
        update: {
          season_year: year,
          round: race.round,
          points: parseFloat(row.points),
          position,
          wins: parseInt(row.wins, 10) || 0,
        },
        create: {
          race_id: race.id,
          driver_id: driver.id,
          season_year: year,
          round: race.round,
          points: parseFloat(row.points),
          position,
          wins: parseInt(row.wins, 10) || 0,
        },
      });
    }

    const constructorData = await fetchJolpicaJson(
      `${JOLPICA_BASE}/${year}/${race.round}/constructorStandings.json`,
    );
    const constructorRows =
      constructorData?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];

    for (const row of constructorRows) {
      const constructor = await prisma.f1_constructors.findUnique({
        where: { constructor_ref: row.Constructor.constructorId },
      });
      if (!constructor) continue;

      const cPosition = parseStandingPosition(row);
      if (cPosition === null) continue;

      await prisma.f1_constructor_standings.upsert({
        where: {
          race_id_constructor_id: { race_id: race.id, constructor_id: constructor.id },
        },
        update: {
          season_year: year,
          round: race.round,
          points: parseFloat(row.points),
          position: cPosition,
          wins: parseInt(row.wins, 10) || 0,
        },
        create: {
          race_id: race.id,
          constructor_id: constructor.id,
          season_year: year,
          round: race.round,
          points: parseFloat(row.points),
          position: cPosition,
          wins: parseInt(row.wins, 10) || 0,
        },
      });
    }

    await delay(DELAY_MS);
  }
}

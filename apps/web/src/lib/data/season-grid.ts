import { prisma } from "@pitwall/db";
import { getPublishedSeasonRoundCount } from "./season-calendar";

const DRIVER_GRID_FIELDS = {
  id: true,
  driver_ref: true,
  first_name: true,
  last_name: true,
  full_name: true,
  number: true,
  nationality: true,
  code: true,
  is_active: true,
  headshot_url: true,
} as const;

const CONSTRUCTOR_GRID_FIELDS = {
  id: true,
  constructor_ref: true,
  name: true,
  nationality: true,
  color_primary: true,
  is_active: true,
  logo_url: true,
} as const;

async function getDriversFromRaceEntries(seasonYear: number) {
  const latestRace = await prisma.f1_races.findFirst({
    where: {
      season_year: seasonYear,
      entries: { some: {} },
    },
    orderBy: { round: "desc" },
    select: { id: true },
  });

  if (!latestRace) return null;

  const entries = await prisma.f1_race_entries.findMany({
    where: { race_id: latestRace.id },
    orderBy: { car_number: "asc" },
  });

  if (!entries.length) return null;

  const driverIds = [...new Set(entries.map((e) => e.driver_id))];
  return prisma.f1_drivers.findMany({
    where: { id: { in: driverIds } },
    orderBy: { number: "asc" },
    select: DRIVER_GRID_FIELDS,
  });
}

async function getConstructorsFromRaceEntries(seasonYear: number) {
  const latestRace = await prisma.f1_races.findFirst({
    where: {
      season_year: seasonYear,
      entries: { some: {} },
    },
    orderBy: { round: "desc" },
    select: { id: true },
  });

  if (!latestRace) return null;

  const entries = await prisma.f1_race_entries.findMany({
    where: { race_id: latestRace.id },
  });

  if (!entries.length) return null;

  const constructorIds = [...new Set(entries.map((e) => e.constructor_id))];
  return prisma.f1_constructors.findMany({
    where: { id: { in: constructorIds } },
    orderBy: { name: "asc" },
    select: CONSTRUCTOR_GRID_FIELDS,
  });
}

async function getDriversFromStandings(seasonYear: number) {
  const latestRound = await prisma.f1_driver_standings.findFirst({
    where: { season_year: seasonYear },
    orderBy: { round: "desc" },
    select: { round: true },
  });

  if (!latestRound) return null;

  const standings = await prisma.f1_driver_standings.findMany({
    where: { season_year: seasonYear, round: latestRound.round },
    orderBy: { position: "asc" },
    include: { driver: { select: DRIVER_GRID_FIELDS } },
  });

  if (!standings.length) return null;
  return standings.map((s) => s.driver);
}

async function getConstructorsFromStandings(seasonYear: number) {
  const latestRound = await prisma.f1_constructor_standings.findFirst({
    where: { season_year: seasonYear },
    orderBy: { round: "desc" },
  });

  if (!latestRound) return null;

  const standings = await prisma.f1_constructor_standings.findMany({
    where: { season_year: seasonYear, round: latestRound.round },
    orderBy: { position: "asc" },
    include: { constructor: { select: CONSTRUCTOR_GRID_FIELDS } },
  });

  if (!standings.length) return null;
  return standings.map((s) => s.constructor);
}

async function getDriversFromResults(seasonYear: number) {
  return prisma.$queryRaw<
    Array<{
      id: number;
      driver_ref: string;
      first_name: string;
      last_name: string;
      full_name: string;
      number: number | null;
      nationality: string | null;
      code: string | null;
      is_active: boolean;
      headshot_url: string | null;
    }>
  >`
    SELECT DISTINCT ON (d.id)
      d.id, d.driver_ref, d.first_name, d.last_name, d.full_name,
      d.number, d.nationality, d.code, d.is_active, d.headshot_url
    FROM f1_drivers d
    JOIN f1_results res ON res.driver_id = d.id
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    WHERE r.season_year = ${seasonYear} AND s.session_type = 'R'
    ORDER BY d.id, d.number ASC NULLS LAST
  `;
}

async function getConstructorsFromResults(seasonYear: number) {
  return prisma.$queryRaw<
    Array<{
      id: number;
      constructor_ref: string;
      name: string;
      nationality: string | null;
      color_primary: string | null;
      is_active: boolean;
      logo_url: string | null;
    }>
  >`
    SELECT DISTINCT ON (c.id)
      c.id, c.constructor_ref, c.name, c.nationality, c.color_primary, c.is_active, c.logo_url
    FROM f1_constructors c
    JOIN f1_results res ON res.constructor_id = c.id
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    WHERE r.season_year = ${seasonYear} AND s.session_type = 'R'
    ORDER BY c.id, c.name ASC
  `;
}

async function attachDriverSeasonFacts<T extends { id: number; number?: number | null }>(
  seasonYear: number,
  drivers: T[],
) {
  if (!drivers.length) return drivers;

  const latestRound = await prisma.f1_driver_standings.findFirst({
    where: { season_year: seasonYear },
    orderBy: { round: "desc" },
    select: { round: true },
  });
  const standings = latestRound
    ? await prisma.f1_driver_standings.findMany({
        where: { season_year: seasonYear, round: latestRound.round },
      })
    : [];
  const byDriver = new Map(standings.map((row) => [row.driver_id, row]));

  const latestRace = await prisma.f1_races.findFirst({
    where: { season_year: seasonYear, entries: { some: {} } },
    orderBy: { round: "desc" },
    select: { id: true },
  });
  const entries = latestRace
    ? await prisma.f1_race_entries.findMany({
        where: { race_id: latestRace.id },
        include: { constructor: { select: { name: true } } },
      })
    : [];
  const teamByDriver = new Map(entries.map((entry) => [entry.driver_id, entry.constructor.name]));

  return drivers
    .map((driver) => {
      const standing = byDriver.get(driver.id);
      return {
        ...driver,
        championship_position: standing?.position ?? null,
        points: standing?.points ?? null,
        wins: standing?.wins ?? null,
        constructor_name: teamByDriver.get(driver.id) ?? null,
      };
    })
    .sort((a, b) => {
      if (a.championship_position == null && b.championship_position == null) {
        return (a.number ?? 999) - (b.number ?? 999);
      }
      if (a.championship_position == null) return 1;
      if (b.championship_position == null) return -1;
      return a.championship_position - b.championship_position;
    });
}

async function attachConstructorSeasonFacts<T extends { id: number; name?: string | null }>(
  seasonYear: number,
  constructors: T[],
) {
  if (!constructors.length) return constructors;
  const latestRound = await prisma.f1_constructor_standings.findFirst({
    where: { season_year: seasonYear },
    orderBy: { round: "desc" },
  });
  if (!latestRound) {
    return constructors.map((constructor) => ({
      ...constructor,
      season_position: null as number | null,
      season_points: null as number | null,
      season_wins: null as number | null,
    }));
  }
  const standings = await prisma.f1_constructor_standings.findMany({
    where: { season_year: seasonYear, round: latestRound.round },
  });
  const byId = new Map(standings.map((row) => [row.constructor_id, row]));
  return constructors
    .map((constructor) => {
      const standing = byId.get(constructor.id);
      return {
        ...constructor,
        season_position: standing?.position ?? null,
        season_points: standing?.points ?? null,
        season_wins: standing?.wins ?? null,
      };
    })
    .sort((a, b) => (a.season_position ?? 999) - (b.season_position ?? 999) || (a.name ?? "").localeCompare(b.name ?? ""));
}

export async function getSeasonGridDrivers(seasonYear: number) {
  const fromEntries = await getDriversFromRaceEntries(seasonYear);
  if (fromEntries?.length) return attachDriverSeasonFacts(seasonYear, fromEntries);

  const fromStandings = await getDriversFromStandings(seasonYear);
  if (fromStandings?.length) return attachDriverSeasonFacts(seasonYear, fromStandings);

  return attachDriverSeasonFacts(seasonYear, await getDriversFromResults(seasonYear));
}

export async function getSeasonConstructors(seasonYear: number) {
  const fromEntries = await getConstructorsFromRaceEntries(seasonYear);
  if (fromEntries?.length) return attachConstructorSeasonFacts(seasonYear, fromEntries);

  const fromStandings = await getConstructorsFromStandings(seasonYear);
  if (fromStandings?.length) return attachConstructorSeasonFacts(seasonYear, fromStandings);

  return attachConstructorSeasonFacts(seasonYear, await getConstructorsFromResults(seasonYear));
}

export async function getSeasonStats(seasonYear: number) {
  const [dbRaceCount, completedRaces, totalPoints, publishedRounds] = await Promise.all([
    prisma.f1_races.count({ where: { season_year: seasonYear } }),
    prisma.f1_races.count({
      where: { season_year: seasonYear, race_date: { lt: new Date() } },
    }),
    prisma.$queryRaw<[{ total: number | null }]>`
      SELECT COALESCE(SUM(res.points), 0)::float as total
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE r.season_year = ${seasonYear} AND s.session_type = 'R'
    `,
    Promise.resolve(getPublishedSeasonRoundCount(seasonYear)),
  ]);

  // f1_races is the calendar. season.json round numbers drift when Jolpica
  // drops or inserts a grand prix, so it must not override a fuller database.
  const raceCount = dbRaceCount > 0 ? dbRaceCount : (publishedRounds ?? 0);

  return {
    raceCount,
    completedRaces,
    pointsAwarded: Number(totalPoints[0]?.total ?? 0),
    calendarPartial: publishedRounds != null && dbRaceCount > 0 && dbRaceCount < publishedRounds,
  };
}

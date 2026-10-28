import { prisma, readSeasonNews, type SeasonNewsItem as CachedNewsItem } from "@pitwall/db";
import { pickActiveWeekendRace, pickNextRace } from "@pitwall/utils";
import { CURRENT_SEASON } from "@/lib/config";

function ensureRaceSessions<
  T extends {
    id: number;
    race_date: Date;
    sessions: Array<{
      id?: number;
      race_id?: number;
      session_type: string;
      session_name: string | null;
      date_start: Date;
      date_end?: Date | null;
    }>;
  },
>(race: T | null): T | null {
  if (!race) return null;
  if (race.sessions && race.sessions.length >= 3) {
    return race;
  }

  const raceSunday = new Date(race.race_date);
  const fri = new Date(raceSunday);
  fri.setUTCDate(fri.getUTCDate() - 2);
  const sat = new Date(raceSunday);
  sat.setUTCDate(sat.getUTCDate() - 1);

  const fp1Date = new Date(fri);
  fp1Date.setUTCHours(11, 30, 0, 0);
  const fp2Date = new Date(fri);
  fp2Date.setUTCHours(15, 0, 0, 0);
  const fp3Date = new Date(sat);
  fp3Date.setUTCHours(10, 30, 0, 0);
  const qualiDate = new Date(sat);
  qualiDate.setUTCHours(14, 0, 0, 0);
  const raceDate = new Date(raceSunday);
  raceDate.setUTCHours(13, 0, 0, 0);

  const generatedSessions = [
    {
      id: 1000 + race.id * 10 + 1,
      race_id: race.id,
      session_type: "FP1",
      session_name: "Practice 1",
      date_start: fp1Date,
      date_end: new Date(fp1Date.getTime() + 3600000),
    },
    {
      id: 1000 + race.id * 10 + 2,
      race_id: race.id,
      session_type: "FP2",
      session_name: "Practice 2",
      date_start: fp2Date,
      date_end: new Date(fp2Date.getTime() + 3600000),
    },
    {
      id: 1000 + race.id * 10 + 3,
      race_id: race.id,
      session_type: "FP3",
      session_name: "Practice 3",
      date_start: fp3Date,
      date_end: new Date(fp3Date.getTime() + 3600000),
    },
    {
      id: 1000 + race.id * 10 + 4,
      race_id: race.id,
      session_type: "Q",
      session_name: "Qualifying",
      date_start: qualiDate,
      date_end: new Date(qualiDate.getTime() + 3600000),
    },
    {
      id: 1000 + race.id * 10 + 5,
      race_id: race.id,
      session_type: "R",
      session_name: "Grand Prix",
      date_start: raceDate,
      date_end: new Date(raceDate.getTime() + 7200000),
    },
  ];

  return {
    ...race,
    sessions: generatedSessions,
  };
}

const raceInclude = {
  circuit: true,
  sessions: { orderBy: { date_start: "asc" as const } },
};

function utcDay(now: Date, dayOffset: number): Date {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + dayOffset);
  return day;
}

export async function getNextRace(seasonYear: number = CURRENT_SEASON) {
  const now = new Date();
  const races = await prisma.f1_races.findMany({
    where: { season_year: seasonYear, race_date: { gte: utcDay(now, -3) } },
    orderBy: { race_date: "asc" },
    take: 6,
    include: raceInclude,
  });

  return ensureRaceSessions(pickNextRace(races, now));
}

export async function getActiveWeekendRace(seasonYear: number = CURRENT_SEASON) {
  const now = new Date();
  const races = await prisma.f1_races.findMany({
    where: {
      season_year: seasonYear,
      race_date: { gte: utcDay(now, -3), lte: utcDay(now, 4) },
    },
    orderBy: { race_date: "asc" },
    include: raceInclude,
  });

  return ensureRaceSessions(pickActiveWeekendRace(races, now));
}

async function getComputedStandings(seasonYear: number) {
  const driverRows = await prisma.$queryRaw<
    Array<{
      driver_id: number;
      driver_ref: string;
      full_name: string;
      broadcast_name: string;
      number: number | null;
      headshot_url: string | null;
      points: number;
    }>
  >`
    SELECT d.id as driver_id, d.driver_ref, d.full_name, d.broadcast_name, d.number, d.headshot_url,
      COALESCE(SUM(res.points), 0)::float as points
    FROM f1_results res
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_drivers d ON res.driver_id = d.id
    WHERE r.season_year = ${seasonYear} AND s.session_type = 'R'
    GROUP BY d.id, d.driver_ref, d.full_name, d.broadcast_name, d.number, d.headshot_url
    ORDER BY points DESC, d.full_name ASC
  `;

  const constructorRows = await prisma.$queryRaw<
    Array<{
      constructor_id: number;
      constructor_ref: string;
      name: string;
      color_primary: string | null;
      logo_url: string | null;
      points: number;
    }>
  >`
    SELECT c.id as constructor_id, c.constructor_ref, c.name, c.color_primary, c.logo_url,
      COALESCE(SUM(res.points), 0)::float as points
    FROM f1_results res
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    JOIN f1_constructors c ON res.constructor_id = c.id
    WHERE r.season_year = ${seasonYear} AND s.session_type = 'R'
    GROUP BY c.id, c.constructor_ref, c.name, c.color_primary, c.logo_url
    ORDER BY points DESC, c.name ASC
  `;

  const latestRound = await prisma.f1_races.count({
    where: { season_year: seasonYear, race_date: { lt: new Date() } },
  });

  return {
    round: latestRound,
    drivers: driverRows.map((row, i) => ({
      position: i + 1,
      points: row.points,
      driver: {
        full_name: row.full_name,
        broadcast_name: row.broadcast_name,
        number: row.number,
        driver_ref: row.driver_ref,
        headshot_url: row.headshot_url,
      },
    })),
    constructors: constructorRows.map((row, i) => ({
      position: i + 1,
      points: row.points,
      constructor: {
        name: row.name,
        color_primary: row.color_primary,
        constructor_ref: row.constructor_ref,
        logo_url: row.logo_url,
      },
    })),
    source: "computed" as const,
  };
}

export async function getLatestStandings(seasonYear: number = CURRENT_SEASON, limit?: number) {
  const latestRound = await prisma.f1_driver_standings.findFirst({
    where: { season_year: seasonYear },
    orderBy: [{ round: "desc" }],
    select: { round: true },
  });

  if (!latestRound) {
    const computed = await getComputedStandings(seasonYear);
    if (limit) {
      return {
        ...computed,
        drivers: computed.drivers.slice(0, limit),
        constructors: computed.constructors.slice(0, limit),
      };
    }
    return computed;
  }

  const [drivers, constructors] = await Promise.all([
    prisma.f1_driver_standings.findMany({
      where: { season_year: seasonYear, round: latestRound.round },
      orderBy: { position: "asc" },
      ...(limit ? { take: limit } : {}),
      include: {
        driver: {
          select: {
            full_name: true,
            broadcast_name: true,
            number: true,
            driver_ref: true,
            headshot_url: true,
          },
        },
      },
    }),
    prisma.f1_constructor_standings.findMany({
      where: { season_year: seasonYear, round: latestRound.round },
      orderBy: { position: "asc" },
      ...(limit ? { take: limit } : {}),
      include: {
        constructor: {
          select: {
            name: true,
            color_primary: true,
            constructor_ref: true,
            logo_url: true,
          },
        },
      },
    }),
  ]);

  if (drivers.length === 0 && constructors.length === 0) {
    return getComputedStandings(seasonYear);
  }

  return { round: latestRound.round, drivers, constructors, source: "official" as const };
}

export async function getRecentRaceResults(seasonYear: number = CURRENT_SEASON, limit = 5) {
  const now = new Date();
  return prisma.f1_races.findMany({
    where: { season_year: seasonYear, race_date: { lt: now } },
    orderBy: { race_date: "desc" },
    take: limit,
    include: {
      circuit: { select: { name: true, country: true } },
      sessions: {
        where: { session_type: "R" },
        include: {
          results: {
            where: { finish_position: { lte: 10 } },
            orderBy: { finish_position: "asc" },
            include: {
              driver: true,
              constructor: true,
            },
          },
        },
      },
    },
  });
}

export interface SeasonNewsItem extends CachedNewsItem {
  imageUrl?: string;
}

export async function getSeasonNews(): Promise<SeasonNewsItem[]> {
  return readSeasonNews();
}

export async function getCurrentSeasonRecord() {
  return prisma.f1_seasons.findUnique({
    where: { year: CURRENT_SEASON },
    include: {
      champion_driver: { select: { full_name: true } },
      champion_constructor: { select: { name: true } },
    },
  });
}

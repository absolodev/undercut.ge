import { prisma } from "@pitwall/db";
import { enrichConstructor } from "@/lib/assets/constructors";

export type ConstructorDriverRow = {
  driver_id: number;
  driver_ref: string;
  full_name: string;
  headshot_url: string | null;
  seasons: number[];
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  championships: number;
};

export type ConstructorSeasonRow = {
  year: number;
  position: number | null;
  points: number;
  wins: number;
  podiums: number;
  drivers: string[];
  driver_refs: string[];
};

export type ConstructorTopDrivers = {
  wins_leader: string | null;
  poles_leader: string | null;
  points_leader: string | null;
};

export type ConstructorCareerStats = {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  total_points: number;
  /** Constructors' championships (WCC) */
  constructor_championships: number;
  /** Drivers' championships won while driving for this team (WDC) */
  driver_championships: number;
  best_finish: number | null;
};

export async function getConstructorDrivers(constructorId: number): Promise<ConstructorDriverRow[]> {
  const rows = await prisma.$queryRaw<ConstructorDriverRow[]>`
    WITH driver_ids AS (
      SELECT DISTINCT res.driver_id
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      WHERE res.constructor_id = ${constructorId} AND s.session_type = 'R'
      UNION
      SELECT DISTINCT e.driver_id
      FROM f1_race_entries e
      WHERE e.constructor_id = ${constructorId}
    ),
    driver_stats AS (
      SELECT
        res.driver_id,
        COUNT(DISTINCT r.id) as races,
        COUNT(*) FILTER (WHERE res.finish_position = 1) as wins,
        COUNT(*) FILTER (WHERE res.finish_position <= 3) as podiums,
        COALESCE(SUM(res.points), 0) as points
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE res.constructor_id = ${constructorId} AND s.session_type = 'R'
      GROUP BY res.driver_id
    ),
    driver_poles AS (
      SELECT qr.driver_id, COUNT(*)::int as poles
      FROM f1_qualifying_results qr
      JOIN f1_sessions s ON qr.session_id = s.id
      WHERE qr.constructor_id = ${constructorId}
        AND qr.position = 1
        AND s.session_type = 'Q'
      GROUP BY qr.driver_id
    ),
    driver_seasons AS (
      SELECT
        res.driver_id,
        ARRAY_AGG(DISTINCT r.season_year ORDER BY r.season_year) as seasons
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE res.constructor_id = ${constructorId} AND s.session_type = 'R'
      GROUP BY res.driver_id
    ),
    primary_team AS (
      SELECT
        r.season_year,
        res.driver_id,
        res.constructor_id,
        ROW_NUMBER() OVER (
          PARTITION BY r.season_year, res.driver_id
          ORDER BY COUNT(*) DESC
        ) as rn
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE s.session_type = 'R'
      GROUP BY r.season_year, res.driver_id, res.constructor_id
    ),
    driver_championships AS (
      SELECT pt.driver_id, COUNT(*)::int as championships
      FROM f1_seasons fs
      JOIN primary_team pt
        ON pt.season_year = fs.year
        AND pt.driver_id = fs.champion_driver_id
        AND pt.rn = 1
        AND pt.constructor_id = ${constructorId}
      WHERE fs.champion_driver_id IS NOT NULL
      GROUP BY pt.driver_id
    )
    SELECT
      d.id as driver_id,
      d.driver_ref,
      d.full_name,
      d.headshot_url,
      ds.seasons,
      COALESCE(dst.races, 0)::int as races,
      COALESCE(dst.wins, 0)::int as wins,
      COALESCE(dst.podiums, 0)::int as podiums,
      COALESCE(dp.poles, 0)::int as poles,
      COALESCE(dst.points, 0)::float as points,
      COALESCE(dc.championships, 0)::int as championships
    FROM driver_ids di
    JOIN f1_drivers d ON d.id = di.driver_id
    LEFT JOIN driver_stats dst ON dst.driver_id = d.id
    LEFT JOIN driver_poles dp ON dp.driver_id = d.id
    LEFT JOIN driver_seasons ds ON ds.driver_id = d.id
    LEFT JOIN driver_championships dc ON dc.driver_id = d.id
    ORDER BY COALESCE(dst.points, 0) DESC, d.full_name ASC
  `;

  return rows.map((row) => ({
    ...row,
    seasons: Array.isArray(row.seasons) ? row.seasons.map(Number) : [],
    races: Number(row.races),
    wins: Number(row.wins),
    podiums: Number(row.podiums),
    poles: Number(row.poles),
    points: Number(row.points),
    championships: Number(row.championships),
  }));
}

export async function getConstructorSeasonHistory(
  constructorId: number
): Promise<ConstructorSeasonRow[]> {
  const rows = await prisma.$queryRaw<ConstructorSeasonRow[]>`
    WITH latest_standings AS (
      SELECT DISTINCT ON (season_year)
        season_year,
        position,
        points
      FROM f1_constructor_standings
      WHERE constructor_id = ${constructorId}
      ORDER BY season_year, round DESC
    ),
    season_results AS (
      SELECT
        r.season_year as year,
        COUNT(*) FILTER (WHERE res.finish_position = 1)::int as wins,
        COUNT(*) FILTER (WHERE res.finish_position <= 3)::int as podiums,
        COALESCE(SUM(res.points), 0)::float as points
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE res.constructor_id = ${constructorId} AND s.session_type = 'R'
      GROUP BY r.season_year
    ),
    season_drivers AS (
      SELECT
        r.season_year as year,
        ARRAY_AGG(DISTINCT d.full_name ORDER BY d.full_name) as drivers,
        ARRAY_AGG(DISTINCT d.driver_ref ORDER BY d.driver_ref) as driver_refs
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      JOIN f1_drivers d ON d.id = res.driver_id
      WHERE res.constructor_id = ${constructorId} AND s.session_type = 'R'
      GROUP BY r.season_year
    )
    SELECT
      sr.year,
      ls.position,
      sr.points,
      sr.wins,
      sr.podiums,
      COALESCE(sd.drivers, ARRAY[]::text[]) as drivers,
      COALESCE(sd.driver_refs, ARRAY[]::text[]) as driver_refs
    FROM season_results sr
    LEFT JOIN latest_standings ls ON ls.season_year = sr.year
    LEFT JOIN season_drivers sd ON sd.year = sr.year
    ORDER BY sr.year DESC
  `;

  return rows.map((row) => ({
    ...row,
    year: Number(row.year),
    position: row.position != null ? Number(row.position) : null,
    points: Number(row.points),
    wins: Number(row.wins),
    podiums: Number(row.podiums),
    drivers: row.drivers ?? [],
    driver_refs: row.driver_refs ?? [],
  }));
}

export async function getConstructorTopDriverStats(
  constructorId: number
): Promise<ConstructorTopDrivers> {
  const drivers = await getConstructorDrivers(constructorId);
  if (!drivers.length) {
    return { wins_leader: null, poles_leader: null, points_leader: null };
  }

  const byWins = [...drivers].sort((a, b) => b.wins - a.wins || b.points - a.points);
  const byPoles = [...drivers].sort((a, b) => b.poles - a.poles || b.points - a.points);
  const byPoints = [...drivers].sort((a, b) => b.points - a.points);

  return {
    wins_leader: byWins[0]?.wins ? byWins[0].full_name : null,
    poles_leader: byPoles[0]?.poles ? byPoles[0].full_name : null,
    points_leader: byPoints[0]?.points ? byPoints[0].full_name : null,
  };
}

async function getConstructorCareerStats(constructorId: number): Promise<ConstructorCareerStats> {
  const [raceStats, poles, constructorChampionships, driverChampionships, bestFinish] = await Promise.all([
    prisma.$queryRaw<
      [{ races: bigint; wins: bigint; podiums: bigint; total_points: number | null }]
    >`
      SELECT
        COUNT(DISTINCT r.id) as races,
        COUNT(*) FILTER (WHERE res.finish_position = 1) as wins,
        COUNT(*) FILTER (WHERE res.finish_position <= 3) as podiums,
        SUM(res.points) as total_points
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE res.constructor_id = ${constructorId} AND s.session_type = 'R'
    `,
    prisma.$queryRaw<[{ poles: bigint }]>`
      SELECT COUNT(*) as poles
      FROM f1_qualifying_results qr
      JOIN f1_sessions s ON qr.session_id = s.id
      WHERE qr.constructor_id = ${constructorId}
        AND qr.position = 1
        AND s.session_type = 'Q'
    `,
    prisma.$queryRaw<[{ championships: bigint }]>`
      SELECT COUNT(*)::bigint as championships
      FROM f1_seasons
      WHERE champion_constructor_id = ${constructorId}
    `,
    prisma.$queryRaw<[{ championships: bigint }]>`
      SELECT COUNT(*)::bigint as championships
      FROM f1_seasons fs
      JOIN LATERAL (
        SELECT res.constructor_id
        FROM f1_driver_standings ds
        JOIN f1_races dr ON dr.id = ds.race_id
        JOIN f1_sessions sess ON sess.race_id = dr.id AND sess.session_type = 'R'
        JOIN f1_results res ON res.session_id = sess.id AND res.driver_id = ds.driver_id
        WHERE ds.season_year = fs.year
          AND ds.driver_id = fs.champion_driver_id
        ORDER BY ds.round DESC
        LIMIT 1
      ) final_standing ON true
      WHERE fs.champion_driver_id IS NOT NULL
        AND final_standing.constructor_id = ${constructorId}
    `,
    prisma.$queryRaw<[{ best_finish: number | null }]>`
      SELECT MIN(position)::int as best_finish
      FROM (
        SELECT DISTINCT ON (season_year)
          position
        FROM f1_constructor_standings
        WHERE constructor_id = ${constructorId}
        ORDER BY season_year, round DESC
      ) final_positions
    `,
  ]);

  const s = raceStats[0] ?? { races: 0, wins: 0, podiums: 0, total_points: 0 };
  return {
    races: Number(s.races),
    wins: Number(s.wins),
    podiums: Number(s.podiums),
    poles: Number(poles[0]?.poles ?? 0),
    total_points: Number(s.total_points ?? 0),
    constructor_championships: Number(constructorChampionships[0]?.championships ?? 0),
    driver_championships: Number(driverChampionships[0]?.championships ?? 0),
    best_finish: bestFinish[0]?.best_finish ?? null,
  };
}

export async function getConstructorProfile(constructorRef: string) {
  const constructor = await prisma.f1_constructors.findUnique({
    where: { constructor_ref: constructorRef },
    include: {
      predecessor: true,
      successors: true,
    },
  });

  if (!constructor) return null;

  const [stats, drivers, seasonHistory, topDrivers] = await Promise.all([
    getConstructorCareerStats(constructor.id),
    getConstructorDrivers(constructor.id),
    getConstructorSeasonHistory(constructor.id),
    getConstructorTopDriverStats(constructor.id),
  ]);

  return {
    constructor: enrichConstructor(constructor),
    stats,
    drivers,
    seasonHistory,
    topDrivers,
  };
}

export type ConstructorQuickStat = {
  constructor_id: number;
  wins: number;
  best_finish: number | null;
};

export async function getConstructorQuickStats(): Promise<ConstructorQuickStat[]> {
  const rows = await prisma.$queryRaw<ConstructorQuickStat[]>`
    WITH final_positions AS (
      SELECT DISTINCT ON (season_year, constructor_id)
        constructor_id,
        position
      FROM f1_constructor_standings
      ORDER BY season_year, constructor_id, round DESC
    ),
    wins AS (
      SELECT res.constructor_id, COUNT(*)::int as wins
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      WHERE s.session_type = 'R' AND res.finish_position = 1
      GROUP BY res.constructor_id
    ),
    best AS (
      SELECT constructor_id, MIN(position)::int as best_finish
      FROM final_positions
      GROUP BY constructor_id
    )
    SELECT
      c.id as constructor_id,
      COALESCE(w.wins, 0)::int as wins,
      b.best_finish
    FROM f1_constructors c
    LEFT JOIN wins w ON w.constructor_id = c.id
    LEFT JOIN best b ON b.constructor_id = c.id
  `;

  return rows.map((row) => ({
    constructor_id: Number(row.constructor_id),
    wins: Number(row.wins),
    best_finish: row.best_finish != null ? Number(row.best_finish) : null,
  }));
}

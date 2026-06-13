import { prisma } from "@pitwall/db";

/** Minimum season year with race results loaded in the DB (UI seasons filter). */
export const UI_MIN_SEASON = 2020;

export type RecordConstructor = {
  constructor_ref: string;
  name: string;
  logo_url: string | null;
  color_primary: string | null;
};

export type DriverRecordRow = {
  id: number;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  count: number;
  constructors: RecordConstructor[];
};

type RawRecordRow = {
  id: number;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  count: bigint | number;
  constructors: RecordConstructor[] | null;
};

function displayName(row: Pick<RawRecordRow, "full_name" | "first_name" | "last_name">): string {
  if (row.first_name && row.last_name) return `${row.first_name} ${row.last_name}`;
  return row.full_name;
}

function mapRecordRows(rows: RawRecordRow[]): DriverRecordRow[] {
  return rows.map((row) => ({
    id: row.id,
    full_name: displayName(row),
    first_name: row.first_name,
    last_name: row.last_name,
    count: Number(row.count),
    constructors: row.constructors ?? [],
  }));
}

/**
 * All-time GP wins across every race session in the database.
 * No season filter — scope is limited only by what has been seeded into f1_results.
 */
export async function getMostWins(): Promise<DriverRecordRow[]> {
  const rows = await prisma.$queryRaw<RawRecordRow[]>`
    SELECT
      d.id,
      d.full_name,
      d.first_name,
      d.last_name,
      COUNT(*)::int AS count,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'constructor_ref', c.constructor_ref,
          'name', c.name,
          'logo_url', c.logo_url,
          'color_primary', c.color_primary
        )) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
      ) AS constructors
    FROM f1_results r
    JOIN f1_sessions s ON r.session_id = s.id
    JOIN f1_drivers d ON r.driver_id = d.id
    JOIN f1_constructors c ON r.constructor_id = c.id
    WHERE r.finish_position = 1
      AND s.session_type = 'R'
    GROUP BY d.id, d.full_name, d.first_name, d.last_name
    ORDER BY count DESC
    LIMIT 20
  `;
  return mapRecordRows(rows);
}

/**
 * All-time pole positions across every qualifying session in the database.
 * No season filter — scope is limited only by what has been seeded into f1_qualifying_results.
 */
export async function getMostPoles(): Promise<DriverRecordRow[]> {
  const rows = await prisma.$queryRaw<RawRecordRow[]>`
    SELECT
      d.id,
      d.full_name,
      d.first_name,
      d.last_name,
      COUNT(*)::int AS count,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'constructor_ref', c.constructor_ref,
          'name', c.name,
          'logo_url', c.logo_url,
          'color_primary', c.color_primary
        )) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
      ) AS constructors
    FROM f1_qualifying_results qr
    JOIN f1_sessions s ON qr.session_id = s.id
    JOIN f1_drivers d ON qr.driver_id = d.id
    JOIN f1_constructors c ON qr.constructor_id = c.id
    WHERE qr.position = 1
      AND s.session_type = 'Q'
    GROUP BY d.id, d.full_name, d.first_name, d.last_name
    ORDER BY count DESC
    LIMIT 20
  `;
  return mapRecordRows(rows);
}

/** Reports the actual season span present in race results (for UI disclaimer). */
export async function getRecordsDataCoverage(): Promise<{
  minSeason: number | null;
  maxSeason: number | null;
}> {
  const result = await prisma.$queryRaw<{ min_season: number | null; max_season: number | null }[]>`
    SELECT
      MIN(race.season_year) AS min_season,
      MAX(race.season_year) AS max_season
    FROM f1_results res
    JOIN f1_sessions sess ON res.session_id = sess.id
    JOIN f1_races race ON sess.race_id = race.id
    WHERE sess.session_type = 'R'
      AND res.finish_position = 1
  `;
  const row = result[0];
  return {
    minSeason: row?.min_season ?? null,
    maxSeason: row?.max_season ?? null,
  };
}

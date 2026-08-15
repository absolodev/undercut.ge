import { prisma } from "@pitwall/db";

export async function getDriverProfile(driverRef: string) {
  const driver = await prisma.f1_drivers.findUnique({
    where: { driver_ref: driverRef },
  });
  if (!driver) return null;

  const stats = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE finish_position = 1) as wins,
      COUNT(*) FILTER (WHERE finish_position <= 3) as podiums,
      COUNT(*) as races,
      SUM(points) as total_points,
      COUNT(*) FILTER (WHERE classification = 'DNF') as dnfs,
      AVG(NULLIF(finish_position, 0)) as avg_finish,
      AVG(NULLIF(grid_position, 0)) as avg_grid
    FROM f1_results WHERE driver_id = ${driver.id}
  `;

  const poles = await prisma.$queryRaw`
    SELECT COUNT(*) as poles
    FROM f1_qualifying_results WHERE driver_id = ${driver.id} AND position = 1
  `;

  const fastestLaps = await prisma.f1_results.count({
    where: { driver_id: driver.id, fastest_lap: true },
  });

  const seasonBreakdown = await prisma.$queryRaw`
    WITH latest_standings AS (
      SELECT DISTINCT ON (season_year)
        season_year,
        position
      FROM f1_driver_standings
      WHERE driver_id = ${driver.id}
      ORDER BY season_year, round DESC
    ),
    computed_positions AS (
      SELECT
        r.season_year,
        res.driver_id,
        ROW_NUMBER() OVER (
          PARTITION BY r.season_year
          ORDER BY COALESCE(SUM(res.points), 0) DESC
        ) as position
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE s.session_type = 'R'
      GROUP BY r.season_year, res.driver_id
    ),
    season_team AS (
      SELECT
        r.season_year as year,
        c.name as team,
        c.color_primary as team_color,
        c.constructor_ref,
        ROW_NUMBER() OVER (
          PARTITION BY r.season_year ORDER BY COUNT(*) DESC
        ) as rn
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      JOIN f1_constructors c ON res.constructor_id = c.id
      WHERE res.driver_id = ${driver.id} AND s.session_type = 'R'
      GROUP BY r.season_year, c.name, c.color_primary, c.constructor_ref
    ),
    season_stats AS (
      SELECT
        r.season_year as year,
        COUNT(*) as races,
        COUNT(*) FILTER (WHERE res.finish_position = 1) as wins,
        COUNT(*) FILTER (WHERE res.finish_position <= 3) as podiums,
        SUM(res.points) as points
      FROM f1_results res
      JOIN f1_sessions s ON res.session_id = s.id
      JOIN f1_races r ON s.race_id = r.id
      WHERE res.driver_id = ${driver.id} AND s.session_type = 'R'
      GROUP BY r.season_year
    )
    SELECT
      ss.year,
      st.team,
      st.team_color,
      st.constructor_ref,
      ss.races,
      ss.wins,
      ss.podiums,
      ss.points,
      COALESCE(ls.position, cp.position) as championship_position
    FROM season_stats ss
    LEFT JOIN season_team st ON st.year = ss.year AND st.rn = 1
    LEFT JOIN latest_standings ls ON ls.season_year = ss.year
    LEFT JOIN computed_positions cp ON cp.season_year = ss.year AND cp.driver_id = ${driver.id}
    ORDER BY ss.year DESC
  `;

  return { driver, stats, poles, fastestLaps, seasonBreakdown };
}

export interface TeammateH2HRow {
  teammate_id: number;
  teammate_name: string;
  teammate_ref: string;
  first_year: number;
  last_year: number;
  teams: string;
  races_together: number;
  races_ahead: number;
  races_behind: number;
  quali_ahead: number;
  quali_behind: number;
  driver_points: number;
  teammate_points: number;
  driver_wins: number;
  teammate_wins: number;
  driver_podiums: number;
  teammate_podiums: number;
}

export async function getDriverTeammateH2H(driverId: number): Promise<TeammateH2HRow[]> {
  const rows = await prisma.$queryRaw<any[]>`
    WITH teammate_pairs AS (
      SELECT 
        r1.driver_id AS driver_id,
        r2.driver_id AS teammate_id,
        c.name AS team_name,
        race.season_year,
        race.round,
        r1.finish_position AS d1_pos,
        r2.finish_position AS d2_pos,
        r1.points AS d1_points,
        r2.points AS d2_points,
        q1.position AS d1_quali_pos,
        q2.position AS d2_quali_pos
      FROM f1_results r1
      JOIN f1_sessions s1 ON r1.session_id = s1.id AND s1.session_type = 'R'
      JOIN f1_races race ON s1.race_id = race.id
      JOIN f1_constructors c ON r1.constructor_id = c.id
      JOIN f1_sessions s2 ON s2.race_id = race.id AND s2.session_type = 'R'
      JOIN f1_results r2 ON s2.id = r2.session_id AND r2.constructor_id = r1.constructor_id AND r2.driver_id != r1.driver_id
      LEFT JOIN f1_sessions sq1 ON sq1.race_id = race.id AND sq1.session_type = 'Q'
      LEFT JOIN f1_qualifying_results q1 ON q1.session_id = sq1.id AND q1.driver_id = r1.driver_id
      LEFT JOIN f1_sessions sq2 ON sq2.race_id = race.id AND sq2.session_type = 'Q'
      LEFT JOIN f1_qualifying_results q2 ON q2.session_id = sq2.id AND q2.driver_id = r2.driver_id
      WHERE r1.driver_id = ${driverId}
    )
    SELECT 
      t_drv.id AS teammate_id,
      t_drv.full_name AS teammate_name,
      t_drv.driver_ref AS teammate_ref,
      MIN(season_year)::int AS first_year,
      MAX(season_year)::int AS last_year,
      string_agg(DISTINCT team_name, ', ') AS teams,
      COUNT(DISTINCT season_year || '-' || round)::int AS races_together,
      COUNT(*) FILTER (WHERE d1_pos IS NOT NULL AND d2_pos IS NOT NULL AND d1_pos < d2_pos)::int AS races_ahead,
      COUNT(*) FILTER (WHERE d1_pos IS NOT NULL AND d2_pos IS NOT NULL AND d2_pos < d1_pos)::int AS races_behind,
      COUNT(*) FILTER (WHERE d1_quali_pos IS NOT NULL AND d2_quali_pos IS NOT NULL AND d1_quali_pos < d2_quali_pos)::int AS quali_ahead,
      COUNT(*) FILTER (WHERE d1_quali_pos IS NOT NULL AND d2_quali_pos IS NOT NULL AND d2_quali_pos < d1_quali_pos)::int AS quali_behind,
      COALESCE(SUM(d1_points), 0)::float AS driver_points,
      COALESCE(SUM(d2_points), 0)::float AS teammate_points,
      COUNT(*) FILTER (WHERE d1_pos = 1)::int AS driver_wins,
      COUNT(*) FILTER (WHERE d2_pos = 1)::int AS teammate_wins,
      COUNT(*) FILTER (WHERE d1_pos <= 3)::int AS driver_podiums,
      COUNT(*) FILTER (WHERE d2_pos <= 3)::int AS teammate_podiums
    FROM teammate_pairs tp
    JOIN f1_drivers t_drv ON tp.teammate_id = t_drv.id
    GROUP BY t_drv.id, t_drv.full_name, t_drv.driver_ref
    ORDER BY races_together DESC, first_year DESC;
  `;

  return rows.map((r) => ({
    teammate_id: Number(r.teammate_id),
    teammate_name: r.teammate_name,
    teammate_ref: r.teammate_ref,
    first_year: Number(r.first_year),
    last_year: Number(r.last_year),
    teams: r.teams,
    races_together: Number(r.races_together),
    races_ahead: Number(r.races_ahead),
    races_behind: Number(r.races_behind),
    quali_ahead: Number(r.quali_ahead),
    quali_behind: Number(r.quali_behind),
    driver_points: Number(r.driver_points),
    teammate_points: Number(r.teammate_points),
    driver_wins: Number(r.driver_wins),
    teammate_wins: Number(r.teammate_wins),
    driver_podiums: Number(r.driver_podiums),
    teammate_podiums: Number(r.teammate_podiums),
  }));
}

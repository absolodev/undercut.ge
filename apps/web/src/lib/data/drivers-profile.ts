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

/**
 * Sync latest race results, qualifying, session details, and standings from Jolpica.
 *
 * Usage:
 *   CURRENT_SEASON=2025 tsx prisma/sync-latest.ts
 *   tsx prisma/sync-latest.ts 2025
 *
 * Intended to run after each race weekend (cron, GitHub Actions, or manual).
 */
import { prisma } from "../src/index";
import { seedRacesAndResults, seedQualifyingResults, seedSeasonCalendar } from "./seed";
import { seedSessionDetailsForYear } from "./seed-session-details";
import { seedStandingsForYear } from "./seed-standings";

const year = parseInt(process.argv[2] ?? process.env.CURRENT_SEASON ?? String(new Date().getFullYear()), 10);

async function syncSeason(targetYear: number): Promise<void> {
  console.log(`\n=== UnderCut sync: ${targetYear} ===\n`);

  console.log("1/5 Season calendar …");
  await seedSeasonCalendar(targetYear);

  console.log("2/5 Race results …");
  await seedRacesAndResults(targetYear);

  console.log("3/5 Qualifying results …");
  await seedQualifyingResults(targetYear);

  console.log("4/5 Session details (laps, pits, stints) …");
  await seedSessionDetailsForYear(targetYear);

  console.log("5/5 Standings …");
  await seedStandingsForYear(targetYear);

  const completed = await prisma.f1_races.count({
    where: {
      season_year: targetYear,
      sessions: {
        some: {
          session_type: "R",
          results: { some: { finish_position: { not: null } } },
        },
      },
    },
  });

  console.log(`\nSync complete for ${targetYear}. ${completed} classified race(s) in DB.`);
}

syncSeason(year)
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

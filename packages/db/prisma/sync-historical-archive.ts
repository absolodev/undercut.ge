/**
 * Comprehensive F1 Historical Archive Syncer (1950 - 2025).
 *
 * Populates:
 * 1. All-time World Champions (WDC + WCC) for f1_seasons (1950-2025)
 * 2. All-time Race Calendars, Sessions, and Results (1950-2019) with full pagination
 * 3. All-time Qualifying Results (1950-2019) with full pagination
 * 4. Active driver & constructor flags for the current season
 *
 * Usage:
 *   pnpm --filter @pitwall/db exec tsx prisma/sync-historical-archive.ts
 */
import { prisma } from "../src/index";
import {
  seedCircuitMapsFromOpenF1,
  seedConstructorLogos,
  syncDriverActiveFlags,
} from "./seed-enrichment";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const BASE_DELAY_MS = 350;

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, maxRetries = 6): Promise<any | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const waitMs = attempt * 2500;
        process.stdout.write(` [429 retry in ${waitMs}ms] `);
        await delay(waitMs);
        continue;
      }
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`\nFetch failed after ${maxRetries} attempts for ${url}:`, err);
        return null;
      }
      await delay(attempt * 1500);
    }
  }
  return null;
}

function parseQualifyingTimeToMs(time: string | undefined | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
    return Math.round((minutes * 60 + seconds) * 1000);
  }
  const seconds = parseFloat(time);
  return Number.isNaN(seconds) ? null : Math.round(seconds * 1000);
}

async function upsertDriver(driverData: {
  driverId: string;
  code?: string;
  givenName: string;
  familyName: string;
  permanentNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
}) {
  let driver = await prisma.f1_drivers.findUnique({
    where: { driver_ref: driverData.driverId },
  });

  const broadcastName = driverData.code || driverData.driverId.substring(0, 3).toUpperCase();
  const fullName = `${driverData.givenName} ${driverData.familyName}`.trim();
  const number = driverData.permanentNumber ? parseInt(driverData.permanentNumber, 10) : null;
  const dob = driverData.dateOfBirth ? new Date(driverData.dateOfBirth) : null;

  if (!driver) {
    driver = await prisma.f1_drivers.create({
      data: {
        driver_ref: driverData.driverId,
        broadcast_name: broadcastName,
        first_name: driverData.givenName,
        last_name: driverData.familyName,
        full_name: fullName,
        number: Number.isNaN(number) ? null : number,
        date_of_birth: dob,
        nationality: driverData.nationality || null,
        is_active: false,
      },
    });
  }
  return driver;
}

async function upsertConstructor(constructorData: {
  constructorId: string;
  name: string;
  nationality?: string;
}) {
  let constructor = await prisma.f1_constructors.findUnique({
    where: { constructor_ref: constructorData.constructorId },
  });
  if (!constructor) {
    constructor = await prisma.f1_constructors.create({
      data: {
        constructor_ref: constructorData.constructorId,
        name: constructorData.name,
        full_name: constructorData.name,
        nationality: constructorData.nationality || null,
        color_primary: "#FFFFFF",
        is_active: false,
      },
    });
  }
  return constructor;
}

async function upsertCircuit(c: {
  circuitId: string;
  circuitName: string;
  Location?: { locality?: string; country?: string; lat?: string; long?: string };
}) {
  let circuit = await prisma.f1_circuits.findUnique({
    where: { circuit_ref: c.circuitId },
  });
  if (!circuit) {
    circuit = await prisma.f1_circuits.create({
      data: {
        circuit_ref: c.circuitId,
        name: c.circuitName,
        location: c.Location?.locality || null,
        country: c.Location?.country || null,
        lat: c.Location?.lat ? parseFloat(c.Location.lat) : null,
        lng: c.Location?.long ? parseFloat(c.Location.long) : null,
      },
    });
  }
  return circuit;
}

/**
 * 1. Seed World Champions for all seasons (1950 - 2025)
 */
async function syncAllSeasonChampions(): Promise<void> {
  console.log("\n=== 1. Syncing World Champions (1950 - 2025) ===");
  const currentYear = new Date().getFullYear();

  for (let year = 1950; year <= currentYear; year++) {
    // Ensure season record exists
    await prisma.f1_seasons.upsert({
      where: { year },
      update: {},
      create: { year },
    });

    // Fetch WDC
    const wdcData = await fetchWithRetry(`${JOLPICA_BASE}/${year}/driverStandings/1.json`);
    if (wdcData) {
      const standingList = wdcData.MRData?.StandingsTable?.StandingsLists?.[0];
      const topDriver = standingList?.DriverStandings?.[0]?.Driver;
      if (topDriver) {
        const driver = await upsertDriver(topDriver);
        await prisma.f1_seasons.update({
          where: { year },
          data: { champion_driver_id: driver.id },
        });
      }
    }
    await delay(BASE_DELAY_MS);

    // Fetch WCC (Constructors Championship started in 1958)
    if (year >= 1958) {
      const wccData = await fetchWithRetry(`${JOLPICA_BASE}/${year}/constructorStandings/1.json`);
      if (wccData) {
        const standingList = wccData.MRData?.StandingsTable?.StandingsLists?.[0];
        const topConstructor = standingList?.ConstructorStandings?.[0]?.Constructor;
        if (topConstructor) {
          const constructor = await upsertConstructor(topConstructor);
          await prisma.f1_seasons.update({
            where: { year },
            data: { champion_constructor_id: constructor.id },
          });
        }
      }
      await delay(BASE_DELAY_MS);
    }
  }
  console.log("✓ World Champions synced for 1950 - 2025");
}

/**
 * 2. Sync Historical Races, Sessions, Results & Entries (1950 - 2019) with Pagination
 */
async function syncHistoricalRacesAndResults(): Promise<void> {
  console.log("\n=== 2. Syncing Historical Races & Results (1950 - 2019) ===");

  for (let year = 1950; year <= 2019; year++) {
    process.stdout.write(`Syncing ${year} results... `);
    let offset = 0;
    let total = 1;
    const limit = 100;
    let totalResultsInYear = 0;
    let distinctRaces = 0;

    while (offset < total) {
      const data = await fetchWithRetry(`${JOLPICA_BASE}/${year}/results.json?limit=${limit}&offset=${offset}`);
      if (!data) break;

      total = parseInt(data.MRData?.total, 10) || 0;
      const races = data.MRData?.RaceTable?.Races || [];
      if (!races.length) break;

      for (const r of races) {
        const roundNum = parseInt(r.round, 10);
        const circuit = await upsertCircuit({
          circuitId: r.Circuit.circuitId,
          circuitName: r.Circuit.circuitName,
          Location: r.Circuit.Location,
        });

        const raceDate = new Date(r.date);
        const raceTime = r.time ? new Date(`${r.date}T${r.time}`) : null;

        const race = await prisma.f1_races.upsert({
          where: {
            season_year_round: {
              season_year: year,
              round: roundNum,
            },
          },
          update: {
            race_name: r.raceName,
            race_date: raceDate,
            race_time: raceTime,
            circuit_id: circuit.id,
            url: r.url || null,
          },
          create: {
            season_year: year,
            round: roundNum,
            circuit_id: circuit.id,
            race_name: r.raceName,
            race_date: raceDate,
            race_time: raceTime,
            url: r.url || null,
          },
        });

        // Ensure Race Session 'R'
        let session = await prisma.f1_sessions.findFirst({
          where: { race_id: race.id, session_type: "R" },
        });
        if (!session) {
          session = await prisma.f1_sessions.create({
            data: {
              race_id: race.id,
              session_type: "R",
              session_name: "Race",
              date_start: race.race_date,
              date_end: race.race_date,
            },
          });
        }

        // Process Results
        const results = r.Results || [];
        for (const resItem of results) {
          const driver = await upsertDriver(resItem.Driver);
          const constructor = await upsertConstructor(resItem.Constructor);

          const finishPos = resItem.position ? parseInt(resItem.position, 10) : null;
          const gridPos = resItem.grid ? parseInt(resItem.grid, 10) : null;
          const points = resItem.points ? parseFloat(resItem.points) : 0;
          const laps = resItem.laps ? parseInt(resItem.laps, 10) : 0;
          const isFastestLap = resItem.FastestLap?.rank === "1";
          const carNum = resItem.number ? parseInt(resItem.number, 10) : null;

          // Upsert race entry
          if (carNum !== null && !Number.isNaN(carNum)) {
            await prisma.f1_race_entries.upsert({
              where: {
                race_id_driver_id: {
                  race_id: race.id,
                  driver_id: driver.id,
                },
              },
              update: {
                constructor_id: constructor.id,
                car_number: carNum,
              },
              create: {
                race_id: race.id,
                driver_id: driver.id,
                constructor_id: constructor.id,
                car_number: carNum,
              },
            });
          }

          // Upsert Result
          await prisma.f1_results.upsert({
            where: {
              session_id_driver_id: {
                session_id: session.id,
                driver_id: driver.id,
              },
            },
            update: {
              constructor_id: constructor.id,
              number: Number.isNaN(carNum) ? null : carNum,
              grid_position: Number.isNaN(gridPos) ? null : gridPos,
              finish_position: Number.isNaN(finishPos) ? null : finishPos,
              position_text: resItem.positionText || null,
              points,
              laps,
              status: resItem.status || null,
              fastest_lap: isFastestLap,
              time_str: resItem.Time?.time || null,
              time_ms: resItem.Time?.millis ? parseInt(resItem.Time.millis, 10) : null,
            },
            create: {
              session_id: session.id,
              driver_id: driver.id,
              constructor_id: constructor.id,
              number: Number.isNaN(carNum) ? null : carNum,
              grid_position: Number.isNaN(gridPos) ? null : gridPos,
              finish_position: Number.isNaN(finishPos) ? null : finishPos,
              position_text: resItem.positionText || null,
              points,
              laps,
              status: resItem.status || null,
              fastest_lap: isFastestLap,
              time_str: resItem.Time?.time || null,
              time_ms: resItem.Time?.millis ? parseInt(resItem.Time.millis, 10) : null,
            },
          });
          totalResultsInYear++;
        }
      }

      offset += limit;
      await delay(BASE_DELAY_MS);
    }

    distinctRaces = await prisma.f1_races.count({ where: { season_year: year } });
    await prisma.f1_seasons.upsert({
      where: { year },
      update: { total_races: distinctRaces },
      create: { year, total_races: distinctRaces },
    });

    console.log(`✓ ${distinctRaces} races (${totalResultsInYear} results)`);
  }
}

/**
 * 3. Sync Historical Qualifying Results (1950 - 2019) with Pagination
 */
async function syncHistoricalQualifying(): Promise<void> {
  console.log("\n=== 3. Syncing Historical Qualifying (1950 - 2019) ===");

  for (let year = 1950; year <= 2019; year++) {
    let offset = 0;
    let total = 1;
    const limit = 100;
    let count = 0;
    let hasQualifying = false;

    while (offset < total) {
      const data = await fetchWithRetry(`${JOLPICA_BASE}/${year}/qualifying.json?limit=${limit}&offset=${offset}`);
      if (!data) break;

      total = parseInt(data.MRData?.total, 10) || 0;
      const races = data.MRData?.RaceTable?.Races || [];
      if (!races.length) break;

      if (!hasQualifying) {
        process.stdout.write(`Syncing ${year} qualifying... `);
        hasQualifying = true;
      }

      for (const r of races) {
        const roundNum = parseInt(r.round, 10);
        const race = await prisma.f1_races.findUnique({
          where: {
            season_year_round: {
              season_year: year,
              round: roundNum,
            },
          },
        });
        if (!race) continue;

        let session = await prisma.f1_sessions.findFirst({
          where: { race_id: race.id, session_type: "Q" },
        });
        if (!session) {
          session = await prisma.f1_sessions.create({
            data: {
              race_id: race.id,
              session_type: "Q",
              session_name: "Qualifying",
              date_start: race.race_date,
              date_end: race.race_date,
            },
          });
        }

        const qualifyingResults = r.QualifyingResults || [];
        for (const qr of qualifyingResults) {
          const driver = await upsertDriver(qr.Driver);
          const constructor = await upsertConstructor(qr.Constructor);

          const pos = qr.position ? parseInt(qr.position, 10) : null;
          const num = qr.number ? parseInt(qr.number, 10) : null;
          const q1 = parseQualifyingTimeToMs(qr.Q1);
          const q2 = parseQualifyingTimeToMs(qr.Q2);
          const q3 = parseQualifyingTimeToMs(qr.Q3);

          await prisma.f1_qualifying_results.upsert({
            where: {
              session_id_driver_id: {
                session_id: session.id,
                driver_id: driver.id,
              },
            },
            update: {
              constructor_id: constructor.id,
              number: Number.isNaN(num) ? null : num,
              position: Number.isNaN(pos) ? null : pos,
              q1_time_ms: q1,
              q2_time_ms: q2,
              q3_time_ms: q3,
            },
            create: {
              session_id: session.id,
              driver_id: driver.id,
              constructor_id: constructor.id,
              number: Number.isNaN(num) ? null : num,
              position: Number.isNaN(pos) ? null : pos,
              q1_time_ms: q1,
              q2_time_ms: q2,
              q3_time_ms: q3,
            },
          });
          count++;
        }
      }

      offset += limit;
      await delay(BASE_DELAY_MS);
    }

    if (hasQualifying) {
      console.log(`✓ (${count} results)`);
    }
  }
}

async function main() {
  console.log("🏁 Starting Full F1 Historical Data Sync (1950 - 2026)");

  // 1. All-time World Champions (1950 - 2025)
  await syncAllSeasonChampions();

  // 2. All-time Race Results (1950 - 2019)
  await syncHistoricalRacesAndResults();

  // 3. All-time Qualifying (1950 - 2019)
  await syncHistoricalQualifying();

  // 4. Circuit maps enrichment
  console.log("\n=== 4. Seeding Circuit Maps ===");
  await seedCircuitMapsFromOpenF1();

  // 5. Constructor & Driver active roster flags
  console.log("\n=== 5. Updating Team & Driver Active Statuses ===");
  await seedConstructorLogos();
  await syncDriverActiveFlags();

  console.log("\n✨ Historical F1 archive sync complete!");
}

main()
  .catch((err) => {
    console.error("Archive sync failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

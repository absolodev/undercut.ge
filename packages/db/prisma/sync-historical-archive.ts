/**
 * Comprehensive F1 Historical Archive Syncer (1950 - 2025).
 *
 * 1. Populates All-Time World Champions (WDC + WCC) for f1_seasons (1950-2025)
 * 2. Populates missing historical race results (1950-2012)
 * 3. Populates missing qualifying results (1950-2012)
 * 4. Refreshes active driver & constructor flags
 */
import { prisma } from "../src/index";
import {
  seedCircuitMapsFromOpenF1,
  seedConstructorLogos,
  syncDriverActiveFlags,
} from "./seed-enrichment";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const DELAY_MS = 600;

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Complete verified historical records of Formula 1 World Champions (1950 - 2025)
const HISTORICAL_CHAMPIONS: Array<{
  year: number;
  driver_ref: string;
  driver_name: string;
  constructor_ref?: string;
  constructor_name?: string;
}> = [
  { year: 1950, driver_ref: "farina", driver_name: "Giuseppe Farina" },
  { year: 1951, driver_ref: "fangio", driver_name: "Juan Manuel Fangio" },
  { year: 1952, driver_ref: "ascari", driver_name: "Alberto Ascari" },
  { year: 1953, driver_ref: "ascari", driver_name: "Alberto Ascari" },
  { year: 1954, driver_ref: "fangio", driver_name: "Juan Manuel Fangio" },
  { year: 1955, driver_ref: "fangio", driver_name: "Juan Manuel Fangio" },
  { year: 1956, driver_ref: "fangio", driver_name: "Juan Manuel Fangio" },
  { year: 1957, driver_ref: "fangio", driver_name: "Juan Manuel Fangio" },
  { year: 1958, driver_ref: "hawthorn", driver_name: "Mike Hawthorn", constructor_ref: "vanwall", constructor_name: "Vanwall" },
  { year: 1959, driver_ref: "jack_brabham", driver_name: "Jack Brabham", constructor_ref: "cooper", constructor_name: "Cooper" },
  { year: 1960, driver_ref: "jack_brabham", driver_name: "Jack Brabham", constructor_ref: "cooper", constructor_name: "Cooper" },
  { year: 1961, driver_ref: "phil_hill", driver_name: "Phil Hill", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1962, driver_ref: "graham_hill", driver_name: "Graham Hill", constructor_ref: "brm", constructor_name: "BRM" },
  { year: 1963, driver_ref: "clark", driver_name: "Jim Clark", constructor_ref: "team_lotus", constructor_name: "Lotus" },
  { year: 1964, driver_ref: "surtees", driver_name: "John Surtees", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1965, driver_ref: "clark", driver_name: "Jim Clark", constructor_ref: "team_lotus", constructor_name: "Lotus" },
  { year: 1966, driver_ref: "jack_brabham", driver_name: "Jack Brabham", constructor_ref: "brabham", constructor_name: "Brabham" },
  { year: 1967, driver_ref: "hulme", driver_name: "Denny Hulme", constructor_ref: "brabham", constructor_name: "Brabham" },
  { year: 1968, driver_ref: "graham_hill", driver_name: "Graham Hill", constructor_ref: "team_lotus", constructor_name: "Lotus" },
  { year: 1969, driver_ref: "stewart", driver_name: "Jackie Stewart", constructor_ref: "matra", constructor_name: "Matra" },
  { year: 1970, driver_ref: "rindt", driver_name: "Jochen Rindt", constructor_ref: "team_lotus", constructor_name: "Lotus" },
  { year: 1971, driver_ref: "stewart", driver_name: "Jackie Stewart", constructor_ref: "tyrrell", constructor_name: "Tyrrell" },
  { year: 1972, driver_ref: "emerson_fittipaldi", driver_name: "Emerson Fittipaldi", constructor_ref: "team_lotus", constructor_name: "Lotus" },
  { year: 1973, driver_ref: "stewart", driver_name: "Jackie Stewart", constructor_ref: "team_lotus", constructor_name: "Lotus" },
  { year: 1974, driver_ref: "emerson_fittipaldi", driver_name: "Emerson Fittipaldi", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1975, driver_ref: "lauda", driver_name: "Niki Lauda", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1976, driver_ref: "hunt", driver_name: "James Hunt", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1977, driver_ref: "lauda", driver_name: "Niki Lauda", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1978, driver_ref: "mario_andretti", driver_name: "Mario Andretti", constructor_ref: "team_lotus", constructor_name: "Lotus" },
  { year: 1979, driver_ref: "scheckter", driver_name: "Jody Scheckter", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1980, driver_ref: "alan_jones", driver_name: "Alan Jones", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1981, driver_ref: "piquet", driver_name: "Nelson Piquet", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1982, driver_ref: "keke_rosberg", driver_name: "Keke Rosberg", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1983, driver_ref: "piquet", driver_name: "Nelson Piquet", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 1984, driver_ref: "lauda", driver_name: "Niki Lauda", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1985, driver_ref: "prost", driver_name: "Alain Prost", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1986, driver_ref: "prost", driver_name: "Alain Prost", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1987, driver_ref: "piquet", driver_name: "Nelson Piquet", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1988, driver_ref: "senna", driver_name: "Ayrton Senna", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1989, driver_ref: "prost", driver_name: "Alain Prost", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1990, driver_ref: "senna", driver_name: "Ayrton Senna", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1991, driver_ref: "senna", driver_name: "Ayrton Senna", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1992, driver_ref: "mansell", driver_name: "Nigel Mansell", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1993, driver_ref: "prost", driver_name: "Alain Prost", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1994, driver_ref: "michael_schumacher", driver_name: "Michael Schumacher", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1995, driver_ref: "michael_schumacher", driver_name: "Michael Schumacher", constructor_ref: "benetton", constructor_name: "Benetton" },
  { year: 1996, driver_ref: "damon_hill", driver_name: "Damon Hill", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1997, driver_ref: "villeneuve", driver_name: "Jacques Villeneuve", constructor_ref: "williams", constructor_name: "Williams" },
  { year: 1998, driver_ref: "hakkinen", driver_name: "Mika Häkkinen", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 1999, driver_ref: "hakkinen", driver_name: "Mika Häkkinen", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2000, driver_ref: "michael_schumacher", driver_name: "Michael Schumacher", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2001, driver_ref: "michael_schumacher", driver_name: "Michael Schumacher", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2002, driver_ref: "michael_schumacher", driver_name: "Michael Schumacher", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2003, driver_ref: "michael_schumacher", driver_name: "Michael Schumacher", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2004, driver_ref: "michael_schumacher", driver_name: "Michael Schumacher", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2005, driver_ref: "alonso", driver_name: "Fernando Alonso", constructor_ref: "renault", constructor_name: "Renault" },
  { year: 2006, driver_ref: "alonso", driver_name: "Fernando Alonso", constructor_ref: "renault", constructor_name: "Renault" },
  { year: 2007, driver_ref: "raikkonen", driver_name: "Kimi Räikkönen", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2008, driver_ref: "hamilton", driver_name: "Lewis Hamilton", constructor_ref: "ferrari", constructor_name: "Ferrari" },
  { year: 2009, driver_ref: "button", driver_name: "Jenson Button", constructor_ref: "brawn", constructor_name: "Brawn" },
  { year: 2010, driver_ref: "vettel", driver_name: "Sebastian Vettel", constructor_ref: "red_bull", constructor_name: "Red Bull" },
  { year: 2011, driver_ref: "vettel", driver_name: "Sebastian Vettel", constructor_ref: "red_bull", constructor_name: "Red Bull" },
  { year: 2012, driver_ref: "vettel", driver_name: "Sebastian Vettel", constructor_ref: "red_bull", constructor_name: "Red Bull" },
  { year: 2013, driver_ref: "vettel", driver_name: "Sebastian Vettel", constructor_ref: "red_bull", constructor_name: "Red Bull" },
  { year: 2014, driver_ref: "hamilton", driver_name: "Lewis Hamilton", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2015, driver_ref: "hamilton", driver_name: "Lewis Hamilton", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2016, driver_ref: "rosberg", driver_name: "Nico Rosberg", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2017, driver_ref: "hamilton", driver_name: "Lewis Hamilton", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2018, driver_ref: "hamilton", driver_name: "Lewis Hamilton", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2019, driver_ref: "hamilton", driver_name: "Lewis Hamilton", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2020, driver_ref: "hamilton", driver_name: "Lewis Hamilton", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2021, driver_ref: "max_verstappen", driver_name: "Max Verstappen", constructor_ref: "mercedes", constructor_name: "Mercedes" },
  { year: 2022, driver_ref: "max_verstappen", driver_name: "Max Verstappen", constructor_ref: "red_bull", constructor_name: "Red Bull" },
  { year: 2023, driver_ref: "max_verstappen", driver_name: "Max Verstappen", constructor_ref: "red_bull", constructor_name: "Red Bull" },
  { year: 2024, driver_ref: "max_verstappen", driver_name: "Max Verstappen", constructor_ref: "mclaren", constructor_name: "McLaren" },
  { year: 2025, driver_ref: "norris", driver_name: "Lando Norris", constructor_ref: "mclaren", constructor_name: "McLaren" },
];

async function fetchWithRetry(url: string, maxRetries = 5): Promise<any | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const waitMs = attempt * 3000;
        process.stdout.write(` [rate-limited, waiting ${waitMs}ms] `);
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
      await delay(attempt * 2000);
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

  for (const champ of HISTORICAL_CHAMPIONS) {
    let driver = await prisma.f1_drivers.findUnique({
      where: { driver_ref: champ.driver_ref },
    });
    if (!driver) {
      const parts = champ.driver_name.split(" ");
      driver = await prisma.f1_drivers.create({
        data: {
          driver_ref: champ.driver_ref,
          broadcast_name: champ.driver_ref.substring(0, 3).toUpperCase(),
          first_name: parts[0],
          last_name: parts.slice(1).join(" "),
          full_name: champ.driver_name,
          is_active: false,
        },
      });
    }

    let constructorId: number | null = null;
    if (champ.constructor_ref) {
      let team = await prisma.f1_constructors.findUnique({
        where: { constructor_ref: champ.constructor_ref },
      });
      if (!team) {
        team = await prisma.f1_constructors.create({
          data: {
            constructor_ref: champ.constructor_ref,
            name: champ.constructor_name || champ.constructor_ref,
            full_name: champ.constructor_name || champ.constructor_ref,
            color_primary: "#FFFFFF",
            is_active: false,
          },
        });
      }
      constructorId = team.id;
    }

    await prisma.f1_seasons.upsert({
      where: { year: champ.year },
      update: {
        champion_driver_id: driver.id,
        champion_constructor_id: constructorId,
      },
      create: {
        year: champ.year,
        champion_driver_id: driver.id,
        champion_constructor_id: constructorId,
      },
    });
  }
  console.log(`✓ Seeded ${HISTORICAL_CHAMPIONS.length} World Championship seasons`);
}

/**
 * 2. Sync Historical Races, Sessions, Results & Entries (1950 - 2019) with Pagination
 */
async function syncHistoricalRacesAndResults(): Promise<void> {
  console.log("\n=== 2. Syncing Historical Races & Results (1950 - 2019) ===");

  for (let year = 1950; year <= 2019; year++) {
    // Check if season is already fully populated
    const existingCount = await prisma.f1_results.count({
      where: {
        session: {
          race: { season_year: year },
          session_type: "R",
        },
      },
    });

    if (existingCount > 50) {
      console.log(`Skipping ${year}: already has ${existingCount} results in DB.`);
      continue;
    }

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
      await delay(DELAY_MS);
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
    const existingQCount = await prisma.f1_qualifying_results.count({
      where: {
        session: {
          race: { season_year: year },
          session_type: "Q",
        },
      },
    });

    if (existingQCount > 50) {
      console.log(`Skipping ${year} qualifying: already has ${existingQCount} in DB.`);
      continue;
    }

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
      await delay(DELAY_MS);
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

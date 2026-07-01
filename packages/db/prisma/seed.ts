import { prisma } from "../src/index";
import {
  seedCircuitMapsFromOpenF1,
  seedConstructorLogos,
  seedSampleTelemetry,
  syncDriverActiveFlags,
} from "./seed-enrichment";
import { seedSessionDetailsForYear } from "./seed-session-details";
import { seedStandingsForYear } from "./seed-standings";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const DELAY_MS = 300;

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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

async function upsertDriverFromApi(driverData: {
  driverId: string;
  code?: string;
  givenName: string;
  familyName: string;
  permanentNumber?: string;
  dateOfBirth?: string;
  nationality: string;
}) {
  let driver = await prisma.f1_drivers.findUnique({
    where: { driver_ref: driverData.driverId },
  });
  if (!driver) {
    driver = await prisma.f1_drivers.create({
      data: {
        driver_ref: driverData.driverId,
        broadcast_name: driverData.code || driverData.driverId.substring(0, 3).toUpperCase(),
        first_name: driverData.givenName,
        last_name: driverData.familyName,
        full_name: `${driverData.givenName} ${driverData.familyName}`,
        number: driverData.permanentNumber ? parseInt(driverData.permanentNumber) : null,
        date_of_birth: driverData.dateOfBirth ? new Date(driverData.dateOfBirth) : null,
        nationality: driverData.nationality,
      },
    });
  }
  return driver;
}

async function upsertConstructorFromApi(constructorData: {
  constructorId: string;
  name: string;
  nationality: string;
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
        nationality: constructorData.nationality,
        color_primary: "#FFFFFF",
      },
    });
  }
  return constructor;
}

async function seedSeasons(startYear = 1950, endYear = 2026): Promise<void> {
  console.log(`Seeding seasons from ${startYear} to ${endYear}...`);
  const res = await fetch(`${JOLPICA_BASE}/seasons.json?limit=100&offset=${startYear - 1950}`);
  const data = await res.json() as any;
  for (const s of data.MRData.SeasonTable.Seasons) {
    const yr = parseInt(s.season);
    if (yr >= startYear && yr <= endYear) {
      await prisma.f1_seasons.upsert({
        where: { year: yr },
        update: {},
        create: { year: yr },
      });
    }
  }
}

async function seedConstructors(): Promise<void> {
  console.log("Seeding constructors...");
  const res = await fetch(`${JOLPICA_BASE}/constructors.json?limit=1000`);
  const data = await res.json() as any;
  for (const c of data.MRData.ConstructorTable.Constructors) {
    await prisma.f1_constructors.upsert({
      where: { constructor_ref: c.constructorId },
      update: {},
      create: {
        constructor_ref: c.constructorId,
        name: c.name,
        full_name: c.name,
        nationality: c.nationality,
        color_primary: "#FFFFFF",
      },
    });
  }
}

async function seedDrivers(): Promise<void> {
  console.log("Seeding drivers...");
  let offset = 0;
  while (true) {
    const res = await fetch(`${JOLPICA_BASE}/drivers.json?limit=100&offset=${offset}`);
    const data = await res.json() as any;
    const drivers = data.MRData.DriverTable.Drivers;
    if (!drivers.length) break;
    for (const d of drivers) {
      await prisma.f1_drivers.upsert({
        where: { driver_ref: d.driverId },
        update: {},
        create: {
          driver_ref: d.driverId,
          broadcast_name: d.code || d.driverId.substring(0, 3).toUpperCase(),
          first_name: d.givenName,
          last_name: d.familyName,
          full_name: `${d.givenName} ${d.familyName}`,
          number: d.permanentNumber ? parseInt(d.permanentNumber) : null,
          date_of_birth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
          nationality: d.nationality,
        },
      });
    }
    offset += 100;
    console.log(`Seeded ${offset} drivers...`);
    await delay(DELAY_MS);
  }
}

async function seedCircuits(): Promise<void> {
  console.log("Seeding circuits...");
  const res = await fetch(`${JOLPICA_BASE}/circuits.json?limit=100`);
  const data = await res.json() as any;
  for (const c of data.MRData.CircuitTable.Circuits) {
    const isSilverstone = c.circuitId === "silverstone";
    const mapSvgPath = null;
    const transformData = isSilverstone
      ? { translateX: 0, translateY: 0, scaleX: 0.08, scaleY: -0.08, rotation: 0 }
      : null;
    const cornerData: unknown[] = [];
    const drsZones: unknown[] = [];

    await prisma.f1_circuits.upsert({
      where: { circuit_ref: c.circuitId },
      update: {},
      create: {
        circuit_ref: c.circuitId,
        name: c.circuitName,
        location: c.Location.locality,
        country: c.Location.country,
        lat: parseFloat(c.Location.lat),
        lng: parseFloat(c.Location.long),
        map_svg_path: mapSvgPath,
        transform_data: transformData as any,
        corner_data: cornerData as any,
        drs_zones: drsZones as any,
      },
    });
  }
}

async function upsertRaceFromJolpica(
  year: number,
  r: {
    round: string;
    raceName: string;
    date: string;
    time?: string;
    url?: string;
    Circuit: {
      circuitId: string;
      circuitName: string;
      Location: { locality: string; country: string; lat: string; long: string };
    };
  },
) {
  let circuit = await prisma.f1_circuits.findUnique({
    where: { circuit_ref: r.Circuit.circuitId },
  });
  if (!circuit) {
    circuit = await prisma.f1_circuits.create({
      data: {
        circuit_ref: r.Circuit.circuitId,
        name: r.Circuit.circuitName,
        location: r.Circuit.Location.locality,
        country: r.Circuit.Location.country,
        lat: parseFloat(r.Circuit.Location.lat),
        lng: parseFloat(r.Circuit.Location.long),
      },
    });
  }

  const raceDate = new Date(r.date);
  const raceTime = r.time ? new Date(`${r.date}T${r.time}`) : null;

  return prisma.f1_races.upsert({
    where: {
      season_year_round: {
        season_year: year,
        round: parseInt(r.round, 10),
      },
    },
    update: {
      race_name: r.raceName,
      race_date: raceDate,
      race_time: raceTime,
    },
    create: {
      season_year: year,
      round: parseInt(r.round, 10),
      circuit_id: circuit.id,
      race_name: r.raceName,
      race_date: raceDate,
      race_time: raceTime,
      url: r.url || null,
    },
  });
}

/** Upsert full season calendar (scheduled + completed rounds) from Jolpica. */
async function seedSeasonCalendar(year: number): Promise<void> {
  console.log(`Seeding season calendar for ${year}...`);
  const res = await fetch(`${JOLPICA_BASE}/${year}.json`);
  const data = (await res.json()) as {
    MRData: { RaceTable: { Races: Parameters<typeof upsertRaceFromJolpica>[1][] } };
  };
  const races = data.MRData.RaceTable.Races ?? [];
  for (const r of races) {
    await upsertRaceFromJolpica(year, r);
  }
  console.log(`Calendar synced: ${races.length} race(s) for ${year}.`);
}

async function seedRacesAndResults(year: number): Promise<void> {
  console.log(`Seeding races and results for ${year}...`);
  let offset = 0;
  let total = 1;
  const limit = 100;

  while (offset < total) {
    console.log(`Fetching results for ${year} with offset ${offset}...`);
    const res = await fetch(`${JOLPICA_BASE}/${year}/results.json?limit=${limit}&offset=${offset}`);
    const data = await res.json() as any;
    
    total = parseInt(data.MRData.total) || 0;
    const races = data.MRData.RaceTable.Races;
    if (!races || races.length === 0) break;

    for (const r of races) {
      const race = await upsertRaceFromJolpica(year, r);

      // 3. Create active session of type 'R' (Race)
      let session = await prisma.f1_sessions.findFirst({
        where: { race_id: race.id, session_type: "R" }
      });
      if (!session) {
        session = await prisma.f1_sessions.create({
          data: {
            race_id: race.id,
            session_type: "R",
            session_name: "Race",
            date_start: race.race_date,
            date_end: race.race_date,
          }
        });
      }

      // 4. Create results
      for (const resItem of r.Results) {
        // Find or fallback-create driver
        let driver = await prisma.f1_drivers.findUnique({
          where: { driver_ref: resItem.Driver.driverId }
        });
        if (!driver) {
          driver = await prisma.f1_drivers.create({
            data: {
              driver_ref: resItem.Driver.driverId,
              broadcast_name: resItem.Driver.code || resItem.Driver.driverId.substring(0, 3).toUpperCase(),
              first_name: resItem.Driver.givenName,
              last_name: resItem.Driver.familyName,
              full_name: `${resItem.Driver.givenName} ${resItem.Driver.familyName}`,
              number: resItem.Driver.permanentNumber ? parseInt(resItem.Driver.permanentNumber) : null,
              date_of_birth: resItem.Driver.dateOfBirth ? new Date(resItem.Driver.dateOfBirth) : null,
              nationality: resItem.Driver.nationality,
            }
          });
        }

        // Find or fallback-create constructor
        let constructor = await prisma.f1_constructors.findUnique({
          where: { constructor_ref: resItem.Constructor.constructorId }
        });
        if (!constructor) {
          constructor = await prisma.f1_constructors.create({
            data: {
              constructor_ref: resItem.Constructor.constructorId,
              name: resItem.Constructor.name,
              full_name: resItem.Constructor.name,
              nationality: resItem.Constructor.nationality,
              color_primary: "#FFFFFF",
            }
          });
        }

        const finishPos = resItem.position ? parseInt(resItem.position) : null;
        const gridPos = resItem.grid ? parseInt(resItem.grid) : null;
        const points = resItem.points ? parseFloat(resItem.points) : 0;
        const laps = resItem.laps ? parseInt(resItem.laps) : 0;

        await prisma.f1_results.upsert({
          where: {
            session_id_driver_id: {
              session_id: session.id,
              driver_id: driver.id
            }
          },
          update: {
            constructor_id: constructor.id,
            number: resItem.number ? parseInt(resItem.number) : null,
            grid_position: gridPos,
            finish_position: finishPos,
            position_text: resItem.positionText || null,
            points,
            laps,
            status: resItem.status || null,
          },
          create: {
            session_id: session.id,
            driver_id: driver.id,
            constructor_id: constructor.id,
            number: resItem.number ? parseInt(resItem.number) : null,
            grid_position: gridPos,
            finish_position: finishPos,
            position_text: resItem.positionText || null,
            points,
            laps,
            status: resItem.status || null,
          }
        });
      }
    }
    offset += limit;
    console.log(`Successfully seeded round chunk up to offset ${offset} of ${total} results...`);
    await delay(DELAY_MS);
  }
}

async function seedQualifyingResults(year: number): Promise<void> {
  console.log(`Seeding qualifying results for ${year}...`);
  let offset = 0;
  let total = 1;
  const limit = 100;

  while (offset < total) {
    console.log(`Fetching qualifying for ${year} with offset ${offset}...`);
    const res = await fetch(`${JOLPICA_BASE}/${year}/qualifying.json?limit=${limit}&offset=${offset}`);
    const data = await res.json() as any;

    total = parseInt(data.MRData.total) || 0;
    const races = data.MRData.RaceTable?.Races;
    if (!races || races.length === 0) break;

    for (const r of races) {
      const race = await prisma.f1_races.findUnique({
        where: {
          season_year_round: {
            season_year: year,
            round: parseInt(r.round),
          },
        },
      });
      if (!race) {
        console.warn(`Skipping qualifying for ${year} R${r.round}: race not found`);
        continue;
      }

      const raceDate = new Date(r.date);
      let session = await prisma.f1_sessions.findFirst({
        where: { race_id: race.id, session_type: "Q" },
      });
      if (!session) {
        session = await prisma.f1_sessions.create({
          data: {
            race_id: race.id,
            session_type: "Q",
            session_name: "Qualifying",
            date_start: raceDate,
            date_end: raceDate,
          },
        });
      }

      const qualifyingResults = r.QualifyingResults ?? [];
      for (const qItem of qualifyingResults) {
        const driver = await upsertDriverFromApi(qItem.Driver);
        const constructor = await upsertConstructorFromApi(qItem.Constructor);
        const position = qItem.position ? parseInt(qItem.position) : null;

        await prisma.f1_qualifying_results.upsert({
          where: {
            session_id_driver_id: {
              session_id: session.id,
              driver_id: driver.id,
            },
          },
          update: {
            constructor_id: constructor.id,
            number: qItem.number ? parseInt(qItem.number) : null,
            position,
            q1_time_ms: parseQualifyingTimeToMs(qItem.Q1),
            q2_time_ms: parseQualifyingTimeToMs(qItem.Q2),
            q3_time_ms: parseQualifyingTimeToMs(qItem.Q3),
          },
          create: {
            session_id: session.id,
            driver_id: driver.id,
            constructor_id: constructor.id,
            number: qItem.number ? parseInt(qItem.number) : null,
            position,
            q1_time_ms: parseQualifyingTimeToMs(qItem.Q1),
            q2_time_ms: parseQualifyingTimeToMs(qItem.Q2),
            q3_time_ms: parseQualifyingTimeToMs(qItem.Q3),
          },
        });
      }
    }

    offset += limit;
    console.log(`Successfully seeded qualifying chunk up to offset ${offset} of ${total}...`);
    await delay(DELAY_MS);
  }
}

export { seedQualifyingResults, seedRacesAndResults, seedSeasonCalendar };

async function main() {
  try {
    await seedSeasons();
    await seedConstructors();
    await seedDrivers();
    await seedCircuits();
    
    // Seed races & podium results for recent seasons including current 2026
    for (let yr = 2020; yr <= 2026; yr++) {
      await seedRacesAndResults(yr);
      await seedQualifyingResults(yr);
      await seedSessionDetailsForYear(yr);
      await seedStandingsForYear(yr);
      await delay(DELAY_MS);
    }

    await syncDriverActiveFlags();
    await seedConstructorLogos();
    await seedSampleTelemetry();

    if (process.env.SEED_CIRCUIT_MAPS === "1") {
      await seedCircuitMapsFromOpenF1();
    }
    
    console.log("Historical database seeding completed successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main();
}

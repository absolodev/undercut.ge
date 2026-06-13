import { prisma } from "@pitwall/db";
import { logger } from "../lib/logger";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const DELAY_MS = 300; // Respect rate limits

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function seedSeasons(startYear = 1950, endYear = 2025): Promise<void> {
  logger.info({ startYear, endYear }, "Seeding seasons");
  const res = await fetch(`${JOLPICA_BASE}/seasons.json?limit=100&offset=${startYear - 1950}`);
  const data = await res.json() as any;
  for (const s of data.MRData.SeasonTable.Seasons) {
    await prisma.f1_seasons.upsert({
      where: { year: parseInt(s.season) },
      update: {},
      create: { year: parseInt(s.season) },
    });
  }
}

export async function seedDrivers(): Promise<void> {
  logger.info("Seeding drivers");
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
    await delay(DELAY_MS);
  }
}

export async function seedCircuits(): Promise<void> {
  logger.info("Seeding circuits");
  const res = await fetch(`${JOLPICA_BASE}/circuits.json?limit=100`);
  const data = await res.json() as any;
  for (const c of data.MRData.CircuitTable.Circuits) {
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
      },
    });
  }
}

// Master seed function
export async function seedAll(): Promise<void> {
  await seedSeasons();
  await seedDrivers();
  await seedCircuits();
  logger.info("Historical seeding complete");
}

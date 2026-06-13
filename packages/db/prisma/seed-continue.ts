import { prisma } from "../src/index";
import { seedSessionDetailsForYear } from "./seed-session-details";
import { seedStandingsForYear } from "./seed-standings";
import {
  seedCircuitMapsFromOpenF1,
  seedConstructorLogos,
  syncDriverActiveFlags,
} from "./seed-enrichment";

const startYear = parseInt(process.env.SEED_START_YEAR ?? "2020", 10);
const endYear = parseInt(process.env.SEED_END_YEAR ?? "2026", 10);
const sessionOnly = process.env.SEED_SESSION_ONLY === "1";
const standingsOnly = process.env.SEED_STANDINGS_ONLY === "1";

async function main() {
  for (let yr = startYear; yr <= endYear; yr++) {
    if (!standingsOnly) await seedSessionDetailsForYear(yr);
    if (!sessionOnly) await seedStandingsForYear(yr);
  }
  if (!sessionOnly && !standingsOnly) {
    await syncDriverActiveFlags();
    await seedConstructorLogos();
    await seedCircuitMapsFromOpenF1();
  }
  console.log("Continuation seed completed.");
}

main()
  .catch((err) => {
    console.error("Continuation failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

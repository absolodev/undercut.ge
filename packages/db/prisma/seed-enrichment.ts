import { prisma } from "../src/index";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/** Seed map_svg_path + viewBox from bundled bacinger/f1-circuits track data. */
export async function seedCircuitMapsFromOpenF1(): Promise<void> {
  console.log("Seeding circuit map SVG paths from bundled track-maps data…");

  const tracksPath = join(__dirname, "../../data/track-maps/tracks.json");
  if (!existsSync(tracksPath)) {
    console.log("  skip — packages/data/track-maps/tracks.json not found");
    return;
  }

  const tracks = JSON.parse(readFileSync(tracksPath, "utf8")) as Record<
    string,
    { svgPath: string; viewBox: { x: number; y: number; width: number; height: number } }
  >;

  let updated = 0;
  for (const [circuitRef, track] of Object.entries(tracks)) {
    const circuit = await prisma.f1_circuits.findUnique({
      where: { circuit_ref: circuitRef },
    });
    if (!circuit) continue;

    await prisma.f1_circuits.update({
      where: { id: circuit.id },
      data: {
        map_svg_path: track.svgPath,
        transform_data: {
          translateX: 0,
          translateY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
      },
    });
    updated++;
  }

  console.log(`  updated ${updated} circuit maps from bundled track data`);
}

export async function seedConstructorLogos(): Promise<void> {
  const path = join(__dirname, "../../data/current/constructors.json");
  if (!existsSync(path)) return;

  const assets = JSON.parse(readFileSync(path, "utf8")) as Array<{
    constructor_ref: string;
    color_primary: string;
    logo_url: string;
  }>;

  for (const asset of assets) {
    await prisma.f1_constructors.updateMany({
      where: { constructor_ref: asset.constructor_ref },
      data: {
        logo_url: asset.logo_url,
        color_primary: asset.color_primary,
        is_active: false,
      },
    });
  }

  const currentYear = new Date().getFullYear();
  const activeRefs = await prisma.$queryRaw<Array<{ constructor_ref: string }>>`
    SELECT DISTINCT c.constructor_ref
    FROM f1_constructors c
    JOIN f1_results res ON res.constructor_id = c.id
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    WHERE r.season_year >= ${currentYear - 1} AND s.session_type = 'R'
  `;

  for (const row of activeRefs) {
    await prisma.f1_constructors.updateMany({
      where: { constructor_ref: row.constructor_ref },
      data: { is_active: true },
    });
  }

  console.log(`Updated constructor logos and marked ${activeRefs.length} teams active`);
}

export async function seedSampleTelemetry(): Promise<void> {
  const existing = await prisma.f1_telemetry.count();
  if (existing > 100) {
    console.log("Telemetry already seeded, skipping");
    return;
  }

  const sessions = await prisma.f1_sessions.findMany({
    where: { session_type: { in: ["R", "Q"] } },
    take: 6,
    orderBy: { id: "desc" },
    include: {
      results: {
        take: 6,
        orderBy: { finish_position: "asc" },
        include: { driver: true },
      },
    },
  });

  let created = 0;
  for (const session of sessions) {
    const drivers = session.results;
    if (!drivers.length) continue;

    for (const result of drivers) {
      for (const lap of [3, 5, 8, 12]) {
        const baseTime = Date.now();
        for (let d = 0; d <= 5000; d += 20) {
          const phase = d / 500;
          const speed = Math.round(80 + Math.sin(phase) * 90 + Math.cos(phase / 2) * 40);
          const throttle = speed > 280 ? 100 : Math.max(0, Math.min(100, Math.round(50 + Math.sin(phase) * 50)));
          const brake = speed < 120 || Math.sin(phase * 2) < -0.85;

          await prisma.f1_telemetry.create({
            data: {
              session_id: session.id,
              driver_id: result.driver_id,
              timestamp: new Date(baseTime + d * 8),
              lap_number: lap,
              distance_m: d,
              x: Math.cos(phase) * 2000 + result.driver_id * 10,
              y: Math.sin(phase) * 1500,
              speed,
              gear: Math.max(1, Math.min(8, Math.floor(speed / 45))),
              throttle,
              brake,
              drs: speed > 260 ? 2 : speed > 220 ? 1 : 0,
            },
          });
          created++;
        }
      }
    }
  }

  console.log(`Seeded ${created} telemetry samples across ${sessions.length} sessions`);
}

export async function syncDriverActiveFlags(): Promise<void> {
  await prisma.f1_drivers.updateMany({ data: { is_active: false } });

  const currentYear = new Date().getFullYear();
  const activeDriverIds = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT DISTINCT d.id
    FROM f1_drivers d
    JOIN f1_results res ON res.driver_id = d.id
    JOIN f1_sessions s ON res.session_id = s.id
    JOIN f1_races r ON s.race_id = r.id
    WHERE r.season_year >= ${currentYear - 1} AND s.session_type = 'R'
  `;

  if (activeDriverIds.length) {
    await prisma.f1_drivers.updateMany({
      where: { id: { in: activeDriverIds.map((d) => d.id) } },
      data: { is_active: true },
    });
  }

  console.log(`Marked ${activeDriverIds.length} drivers as active`);
}

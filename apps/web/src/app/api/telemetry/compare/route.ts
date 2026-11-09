import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@pitwall/db";

export const dynamic = "force-dynamic";

type Sample = {
  distance_m: number | null;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  gear: number | null;
  timestamp: Date;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = Number(searchParams.get("session"));
  const driverAId = Number(searchParams.get("driverA"));
  const lapA = Number(searchParams.get("lapA"));
  const driverBId = Number(searchParams.get("driverB"));
  const lapB = Number(searchParams.get("lapB"));

  if (!sessionId || !driverAId || !lapA || !driverBId || !lapB) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    const [telA, telB, lapRowA, lapRowB, drivers] = await Promise.all([
      prisma.f1_telemetry.findMany({
        where: { session_id: sessionId, driver_id: driverAId, lap_number: lapA },
        orderBy: { distance_m: "asc" },
        select: {
          distance_m: true,
          speed: true,
          throttle: true,
          brake: true,
          gear: true,
          timestamp: true,
        },
      }),
      prisma.f1_telemetry.findMany({
        where: { session_id: sessionId, driver_id: driverBId, lap_number: lapB },
        orderBy: { distance_m: "asc" },
        select: {
          distance_m: true,
          speed: true,
          throttle: true,
          brake: true,
          gear: true,
          timestamp: true,
        },
      }),
      prisma.f1_laps.findFirst({
        where: { session_id: sessionId, driver_id: driverAId, lap_number: lapA },
      }),
      prisma.f1_laps.findFirst({
        where: { session_id: sessionId, driver_id: driverBId, lap_number: lapB },
      }),
      prisma.f1_drivers.findMany({
        where: { id: { in: [driverAId, driverBId] } },
        select: { id: true, broadcast_name: true, full_name: true },
      }),
    ]);

    const merged = mergeByDistance(telA, telB);
    const name = (id: number) => drivers.find((d) => d.id === id);

    return NextResponse.json({
      merged,
      drivers: {
        a: name(driverAId) ?? null,
        b: name(driverBId) ?? null,
      },
      sectors: {
        a: sectorPayload(lapRowA),
        b: sectorPayload(lapRowB),
      },
    });
  } catch (error) {
    console.error("Failed to fetch telemetry", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function sectorPayload(lap: {
  lap_time_ms: number | null;
  sector_1_ms: number | null;
  sector_2_ms: number | null;
  sector_3_ms: number | null;
} | null) {
  if (!lap) return null;
  return {
    lap: lap.lap_time_ms,
    s1: lap.sector_1_ms,
    s2: lap.sector_2_ms,
    s3: lap.sector_3_ms,
  };
}

function atDistance(samples: Sample[], distance: number) {
  if (!samples.length) return null;
  let index = 0;
  while (index < samples.length - 1 && (samples[index + 1].distance_m ?? 0) <= distance) index++;
  const current = samples[index];
  const next = samples[Math.min(index + 1, samples.length - 1)];
  const start = current.distance_m ?? 0;
  const end = next.distance_m ?? start;
  const span = end - start;
  const t = span > 0 ? Math.min(1, Math.max(0, (distance - start) / span)) : 0;
  const mix = (a: number | null, b: number | null) => (a ?? 0) + ((b ?? a ?? 0) - (a ?? 0)) * t;
  const origin = new Date(samples[0].timestamp).getTime();
  return {
    speed: mix(current.speed, next.speed),
    throttle: mix(current.throttle, next.throttle),
    brake: mix(current.brake, next.brake),
    gear: Math.round(mix(current.gear, next.gear)),
    time: (new Date(current.timestamp).getTime() - origin) / 1000 + t * ((new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / 1000),
  };
}

function mergeByDistance(telA: Sample[], telB: Sample[]) {
  const endA = telA[telA.length - 1]?.distance_m || 0;
  const endB = telB[telB.length - 1]?.distance_m || 0;
  const maxDist = Math.min(endA, endB) || Math.max(endA, endB);
  const result = [];
  for (let distance = 0; distance <= maxDist; distance += 10) {
    const a = atDistance(telA, distance);
    const b = atDistance(telB, distance);
    if (!a && !b) continue;
    result.push({
      distance_m: distance,
      speedA: Math.round(a?.speed ?? 0),
      speedB: Math.round(b?.speed ?? 0),
      throttleA: Math.round(a?.throttle ?? 0),
      throttleB: Math.round(b?.throttle ?? 0),
      brakeA: Math.round(a?.brake ?? 0),
      brakeB: Math.round(b?.brake ?? 0),
      gearA: a?.gear ?? 0,
      gearB: b?.gear ?? 0,
      timeA: Number((a?.time ?? 0).toFixed(3)),
      timeB: Number((b?.time ?? 0).toFixed(3)),
      delta: Number(((a?.time ?? 0) - (b?.time ?? 0)).toFixed(3)),
    });
  }
  return result;
}

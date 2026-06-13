import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@pitwall/db";

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
    const [telA, telB] = await Promise.all([
      prisma.f1_telemetry.findMany({
        where: { session_id: sessionId, driver_id: driverAId, lap_number: lapA },
        orderBy: { distance_m: "asc" },
      }),
      prisma.f1_telemetry.findMany({
        where: { session_id: sessionId, driver_id: driverBId, lap_number: lapB },
        orderBy: { distance_m: "asc" },
      }),
    ]);

    // Merge by distance (interpolate to common distance points)
    const merged = mergeByDistance(telA, telB);

    return NextResponse.json({ merged });
  } catch (error) {
    console.error("Failed to fetch telemetry", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function mergeByDistance(telA: any[], telB: any[]) {
  // Use linear interpolation to align both datasets to common distance intervals (every 10m)
  const step = 10; // meters
  const maxDist = Math.max(
    telA[telA.length - 1]?.distance_m || 0,
    telB[telB.length - 1]?.distance_m || 0
  );

  const result = [];
  let iA = 0, iB = 0;

  for (let d = 0; d <= maxDist; d += step) {
    while (iA < telA.length - 1 && telA[iA + 1].distance_m <= d) iA++;
    while (iB < telB.length - 1 && telB[iB + 1].distance_m <= d) iB++;

    // Basic nearest neighbor mapping for now
    result.push({
      distance_m: d,
      speedA: telA[iA]?.speed || 0,
      speedB: telB[iB]?.speed || 0,
      throttleA: telA[iA]?.throttle || 0,
      throttleB: telB[iB]?.throttle || 0,
      brakeA: telA[iA]?.brake || false,
      brakeB: telB[iB]?.brake || false,
      gearA: telA[iA]?.gear ?? 0,
      gearB: telB[iB]?.gear ?? 0,
      timeA: telA[iA]?.timestamp ? new Date(telA[iA].timestamp).getTime() : iA * 100,
      timeB: telB[iB]?.timestamp ? new Date(telB[iB].timestamp).getTime() : iB * 100,
      x: telA[iA]?.x || 0,
      y: telA[iA]?.y || 0,
    });
  }
  return result;
}

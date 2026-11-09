export interface TelemetryComparePoint {
  distance_m: number;
  speedA: number;
  speedB: number;
  throttleA: number;
  throttleB: number;
  brakeA: number;
  brakeB: number;
  gearA: number;
  gearB: number;
  timeA: number;
  timeB: number;
  delta: number;
}

export interface SectorTimes {
  lap: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
}

export interface TelemetryCompareResult {
  merged: TelemetryComparePoint[];
  sectors: { a: SectorTimes | null; b: SectorTimes | null };
}

export async function fetchTelemetryCompare(params: {
  sessionId: number;
  driverAId: number;
  lapA: number;
  driverBId: number;
  lapB: number;
}): Promise<TelemetryCompareResult> {
  const qs = new URLSearchParams({
    session: String(params.sessionId),
    driverA: String(params.driverAId),
    lapA: String(params.lapA),
    driverB: String(params.driverBId),
    lapB: String(params.lapB),
  });

  const res = await fetch(`/api/telemetry/compare?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to load telemetry");
  const json = (await res.json()) as TelemetryCompareResult;
  return {
    merged: json.merged ?? [],
    sectors: json.sectors ?? { a: null, b: null },
  };
}

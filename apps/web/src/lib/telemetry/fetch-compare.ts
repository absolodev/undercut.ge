export interface TelemetryComparePoint {
  distance_m: number;
  speedA: number;
  speedB: number;
  throttleA: number;
  throttleB: number;
  brakeA: boolean;
  brakeB: boolean;
  gearA: number;
  gearB: number;
  timeA: number;
  timeB: number;
  x: number;
  y: number;
}

export async function fetchTelemetryCompare(params: {
  sessionId: number;
  driverAId: number;
  lapA: number;
  driverBId: number;
  lapB: number;
}): Promise<TelemetryComparePoint[]> {
  const qs = new URLSearchParams({
    session: String(params.sessionId),
    driverA: String(params.driverAId),
    lapA: String(params.lapA),
    driverB: String(params.driverBId),
    lapB: String(params.lapB),
  });

  const res = await fetch(`/api/telemetry/compare?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to load telemetry");
  const json = (await res.json()) as { merged: TelemetryComparePoint[] };
  return json.merged;
}

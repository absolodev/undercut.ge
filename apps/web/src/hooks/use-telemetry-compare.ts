"use client";

import { useEffect, useState } from "react";
import { fetchTelemetryCompare, type TelemetryComparePoint } from "@/lib/telemetry/fetch-compare";

export function useTelemetryCompare(
  sessionId: number | null,
  driverA: { id: number; lap: number } | null,
  driverB: { id: number; lap: number } | null
) {
  const [data, setData] = useState<TelemetryComparePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !driverA || !driverB) {
      setData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTelemetryCompare({
      sessionId,
      driverAId: driverA.id,
      lapA: driverA.lap,
      driverBId: driverB.id,
      lapB: driverB.lap,
    })
      .then((merged) => {
        if (!cancelled) setData(merged);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, driverA, driverB]);

  return { data, loading, error };
}

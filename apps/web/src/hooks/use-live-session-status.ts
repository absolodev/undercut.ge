"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveSessionStatus } from "@/lib/live-status-types";

const POLL_INTERVAL_MS = 30_000;

export function useLiveSessionStatus() {
  const [status, setStatus] = useState<LiveSessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/live/status");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as LiveSessionStatus;
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { status, isLoading, error, refresh };
}

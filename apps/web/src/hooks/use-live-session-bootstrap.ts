"use client";

import { useEffect } from "react";
import { useSessionStore } from "@pitwall/stores";
import type { SessionType } from "@pitwall/types";

/**
 * Seeds the live session store from /api/live/status when WebSocket bootstrap
 * has not arrived (e.g. ingestion offline but calendar detects a live session).
 */
export function useLiveSessionBootstrap() {
  const sessionType = useSessionStore((s) => s.sessionType);

  useEffect(() => {
    if (sessionType) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/live/status");
        if (!res.ok || cancelled) return;
        const status = (await res.json()) as {
          isLive?: boolean;
          sessionType?: SessionType | null;
          sessionName?: string | null;
          meetingName?: string | null;
          circuitRef?: string | null;
        };
        if (!status.isLive || cancelled) return;

        useSessionStore.getState().setSession({
          sessionType: status.sessionType ?? "R",
          sessionName: status.sessionName ?? "",
          meetingName: status.meetingName ?? "",
          circuitName: status.circuitRef ?? "",
        });
      } catch {
        // Non-fatal — WS bootstrap may still arrive.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionType]);
}

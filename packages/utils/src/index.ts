import type { SectorColor } from "@pitwall/types";

/**
 * Format a lap or sector time in milliseconds to MM:SS.sss or SS.sss
 */
export function formatLapTime(ms: number | null): string {
  if (!ms) return "—";

  const date = new Date(ms);
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const millis = date.getUTCMilliseconds();

  const formattedSeconds = minutes > 0 ? seconds.toString().padStart(2, "0") : seconds.toString();
  const formattedMillis = millis.toString().padStart(3, "0");

  if (minutes > 0) {
    return `${minutes}:${formattedSeconds}.${formattedMillis}`;
  }
  return `${formattedSeconds}.${formattedMillis}`;
}

/**
 * Format a gap time in seconds or special cases ("+1 LAP")
 */
export function formatGap(gap: string | number | null): string {
  if (gap === null) return "—";
  if (typeof gap === "string") return gap; // e.g. "LEADER", "PIT", "+1 LAP"

  if (gap > 0) {
    return `+${gap.toFixed(3)}`;
  }
  return gap.toFixed(3);
}

/**
 * Linear interpolation (used for smoothing car movement)
 */
export function lerp(start: number, end: number, amt: number): number {
  amt = Math.max(0, Math.min(1, amt)); // clamp to 0-1
  return (1 - amt) * start + amt * end;
}

/**
 * Determine sector color based on personal/overall best status
 */
export function getSectorColor(isOverallBest: boolean, isPersonalBest: boolean): SectorColor {
  if (isOverallBest) return "purple";
  if (isPersonalBest) return "green";
  return "yellow";
}

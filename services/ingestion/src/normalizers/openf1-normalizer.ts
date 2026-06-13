import type { LiveStanding, SectorColor, TireCompound } from "@pitwall/types";

interface OpenF1Driver {
  driver_number: number;
  broadcast_name?: string;
  name_acronym?: string;
  team_name?: string;
  team_colour?: string;
}

interface OpenF1Position {
  driver_number: number;
  position: number;
  date: string;
}

interface OpenF1Interval {
  driver_number: number;
  gap_to_leader?: number | string | null;
  interval?: number | string | null;
}

interface OpenF1Lap {
  driver_number: number;
  lap_number: number;
  lap_duration?: number | null;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  segments_sector_1?: number[];
  segments_sector_2?: number[];
  segments_sector_3?: number[];
  is_pit_out_lap?: boolean;
}

interface OpenF1Stint {
  driver_number: number;
  compound?: string;
  lap_start?: number;
  lap_end?: number | null;
}

function formatGap(value: number | string | null | undefined, isLeader: boolean): string {
  if (isLeader || value === null || value === undefined) return isLeader ? "LEADER" : "";
  if (typeof value === "string") return value.startsWith("+") ? value : `+${value}`;
  return `+${value.toFixed(3)}s`;
}

function segmentColor(segments?: number[]): SectorColor {
  if (!segments?.length) return "none";
  const latest = segments[segments.length - 1];
  if (latest === 2064) return "purple";
  if (latest === 2049) return "green";
  if (latest === 2051) return "yellow";
  if (latest === 2048) return "yellow";
  return "none";
}

function normalizeCompound(raw?: string): TireCompound | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.includes("SOFT")) return "SOFT";
  if (upper.includes("MEDIUM")) return "MEDIUM";
  if (upper.includes("HARD")) return "HARD";
  if (upper.includes("INTER")) return "INTERMEDIATE";
  if (upper.includes("WET")) return "WET";
  return null;
}

export function normalizeStandings(
  positions: OpenF1Position[],
  intervals: OpenF1Interval[],
  drivers: OpenF1Driver[],
  stints: OpenF1Stint[] = [],
  laps: OpenF1Lap[] = []
): LiveStanding[] {
  const latestPosition = new Map<number, OpenF1Position>();
  for (const row of positions) {
    const existing = latestPosition.get(row.driver_number);
    if (!existing || row.date > existing.date) latestPosition.set(row.driver_number, row);
  }

  const intervalByDriver = new Map<number, OpenF1Interval>();
  for (const row of intervals) intervalByDriver.set(row.driver_number, row);

  const driverByNumber = new Map<number, OpenF1Driver>();
  for (const row of drivers) driverByNumber.set(row.driver_number, row);

  const latestLap = new Map<number, OpenF1Lap>();
  for (const row of laps) {
    const existing = latestLap.get(row.driver_number);
    if (!existing || row.lap_number >= existing.lap_number) latestLap.set(row.driver_number, row);
  }

  const stintByDriver = new Map<number, OpenF1Stint>();
  for (const row of stints) {
    if (row.lap_end === null || row.lap_end === undefined) stintByDriver.set(row.driver_number, row);
  }

  return Array.from(latestPosition.values())
    .sort((a, b) => a.position - b.position)
    .map((pos) => {
      const driver = driverByNumber.get(pos.driver_number);
      const interval = intervalByDriver.get(pos.driver_number);
      const lap = latestLap.get(pos.driver_number);
      const stint = stintByDriver.get(pos.driver_number);
      const isLeader = pos.position === 1;
      const teamColor = driver?.team_colour ? `#${driver.team_colour}` : "#888888";

      return {
        driverNumber: pos.driver_number,
        position: pos.position,
        broadcastName: driver?.name_acronym ?? driver?.broadcast_name ?? `#${pos.driver_number}`,
        teamName: driver?.team_name ?? "",
        teamColor,
        gapToLeader: formatGap(interval?.gap_to_leader, isLeader),
        interval: isLeader ? "" : formatGap(interval?.interval, false),
        lastLapMs: lap?.lap_duration ? Math.round(lap.lap_duration * 1000) : null,
        sector1Ms: lap?.duration_sector_1 ? Math.round(lap.duration_sector_1 * 1000) : null,
        sector2Ms: lap?.duration_sector_2 ? Math.round(lap.duration_sector_2 * 1000) : null,
        sector3Ms: lap?.duration_sector_3 ? Math.round(lap.duration_sector_3 * 1000) : null,
        sector1Color: segmentColor(lap?.segments_sector_1),
        sector2Color: segmentColor(lap?.segments_sector_2),
        sector3Color: segmentColor(lap?.segments_sector_3),
        compound: normalizeCompound(stint?.compound),
        tyreAge: stint?.lap_start && lap?.lap_number ? Math.max(0, lap.lap_number - stint.lap_start) : 0,
        pitStops: 0,
        penalties: [],
        isInPit: Boolean(lap?.is_pit_out_lap),
        isRetired: false,
        hasFastestLap: false,
      };
    });
}

export function maxLapNumber(laps: OpenF1Lap[]): number {
  return laps.reduce((max, lap) => Math.max(max, lap.lap_number ?? 0), 0);
}

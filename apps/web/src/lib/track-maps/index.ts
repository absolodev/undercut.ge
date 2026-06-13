import tracksData from "@pitwall/data/track-maps/tracks.json";
import type { CircuitMapData } from "./types";

const TRACKS = tracksData as Record<string, CircuitMapData>;

export function getCircuitData(id: string): CircuitMapData | undefined {
  return TRACKS[id.toLowerCase()];
}

export function getAllCircuitRefs(): string[] {
  return Object.keys(TRACKS);
}

export function hasCircuitMap(id: string): boolean {
  return id.toLowerCase() in TRACKS;
}

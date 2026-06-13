import type { LiveStanding } from "@pitwall/types";
import { readLiveKv } from "@/lib/redis";

export async function getLiveRaceStandings(): Promise<LiveStanding[] | null> {
  const standings = await readLiveKv<LiveStanding[]>("live:standings");
  return standings?.length ? standings : null;
}

export async function getLiveLapCount(): Promise<{ current: number; total: number } | null> {
  return readLiveKv<{ current: number; total: number }>("live:lap");
}

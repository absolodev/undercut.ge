import { redis } from "../lib/redis";

const TTL = 600; // 10 minutes

export const redisKvWriter = {
  async setStandings(standings: any[]): Promise<void> {
    await redis.set("live:standings", JSON.stringify(standings), "EX", TTL);
  },

  async setDriverState(driverNumber: number, state: any): Promise<void> {
    await redis.set(`live:driver:${driverNumber}:state`, JSON.stringify(state), "EX", TTL);
  },

  async setWeather(weather: any): Promise<void> {
    await redis.set("live:weather", JSON.stringify(weather), "EX", TTL);
  },

  async setTrackStatus(flag: string, message: string): Promise<void> {
    await redis.set("live:track:status", JSON.stringify({ status: flag, message }), "EX", TTL);
  },

  async setLapCount(current: number, total: number): Promise<void> {
    await redis.set("live:lap", JSON.stringify({ current, total }), "EX", TTL);
  },

  async setSessionInfo(info: any): Promise<void> {
    await redis.set("live:session:info", JSON.stringify(info), "EX", TTL);
  },
};

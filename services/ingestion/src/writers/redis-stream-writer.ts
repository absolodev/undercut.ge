import { redis } from "../lib/redis";

export const redisStreamWriter = {
  async writePositions(positions: any[]): Promise<void> {
    await redis.xadd(
      "stream:positions",
      "MAXLEN", "~", "2000",
      "*",
      "data", JSON.stringify(positions),
      "ts", Date.now().toString()
    );
  },

  async writeTelemetry(driverNumber: number, telemetry: any): Promise<void> {
    await redis.xadd(
      `stream:telemetry:car:${driverNumber}`,
      "MAXLEN", "~", "5000",
      "*",
      "data", JSON.stringify(telemetry),
      "ts", Date.now().toString()
    );
  },
};

import { BasePoller } from "./base-poller";
import { redisStreamWriter } from "../writers/redis-stream-writer";

export class LocationPoller extends BasePoller {
  constructor() {
    super("location", 300); // 300ms = 3.3Hz
  }

  protected async onData(data: any[]): Promise<void> {
    // Group by timestamp for batch position updates
    const latest = new Map<number, { x: number; y: number; z: number }>();
    for (const d of data) {
      latest.set(d.driver_number, { x: d.x, y: d.y, z: d.z });
    }
    const positions = Array.from(latest.entries()).map(([num, pos]) => ({
      driverNumber: num,
      ...pos,
    }));
    if (positions.length > 0) {
      await redisStreamWriter.writePositions(positions);
    }
  }
}

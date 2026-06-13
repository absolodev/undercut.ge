import { BasePoller } from "./base-poller";
import { maxLapNumber } from "../normalizers/openf1-normalizer";
import { redisKvWriter } from "../writers/redis-kv-writer";

export class LapsPoller extends BasePoller {
  private totalLaps = 0;

  constructor() {
    super("laps", 1000);
  }

  setTotalLaps(total: number): void {
    this.totalLaps = total;
  }

  protected async onData(data: any[], _sessionKey: number): Promise<void> {
    if (!data.length) return;

    const current = maxLapNumber(data);
    if (current > 0) {
      await redisKvWriter.setLapCount(current, this.totalLaps || current);
    }

    for (const lap of data) {
      if (!lap.driver_number) continue;
      await redisKvWriter.setDriverState(lap.driver_number, {
        lapNumber: lap.lap_number,
        lapDurationMs: lap.lap_duration ? Math.round(lap.lap_duration * 1000) : null,
        isPitOutLap: Boolean(lap.is_pit_out_lap),
      });
    }
  }
}

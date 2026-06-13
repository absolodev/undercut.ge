import { BasePoller } from "./base-poller";
import { redisPubSubWriter } from "../writers/redis-pubsub-writer";
import { redisKvWriter } from "../writers/redis-kv-writer";

export class RaceControlPoller extends BasePoller {
  constructor() {
    super("race_control", 1000);
  }

  protected async onData(data: any[]): Promise<void> {
    for (const msg of data) {
      const normalized = {
        id: `rcm-${msg.date}`,
        lap: msg.lap_number,
        category: this.categorize(msg.category),
        flag: msg.flag,
        message: msg.message,
        driverNumber: msg.driver_number,
        sector: msg.sector,
        timestamp: msg.date,
      };
      await redisPubSubWriter.publishRaceControl(normalized);

      // Update track status if flag change
      if (msg.flag) {
        await redisKvWriter.setTrackStatus(msg.flag, msg.message);
      }
    }
  }

  private categorize(cat: string): string {
    const map: Record<string, string> = {
      Flag: "Flag", SafetyCar: "SafetyCar", Drs: "Drs",
      CarEvent: "Other", Other: "Other",
    };
    return map[cat] || "Other";
  }
}

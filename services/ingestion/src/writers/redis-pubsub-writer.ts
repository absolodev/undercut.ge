import { redis } from "../lib/redis";

export const redisPubSubWriter = {
  async publishRaceControl(message: any): Promise<void> {
    await redis.publish("channel:race_control", JSON.stringify(message));
  },

  async publishTeamRadio(message: any): Promise<void> {
    await redis.publish("channel:team_radio", JSON.stringify(message));
  },

  async publishPitEvent(event: any): Promise<void> {
    await redis.publish("channel:pit", JSON.stringify(event));
  },

  async publishTrackStatus(status: any): Promise<void> {
    await redis.publish("channel:track_status", JSON.stringify(status));
  },
};

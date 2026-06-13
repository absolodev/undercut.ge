import { BasePoller } from "./base-poller";
import { redisKvWriter } from "../writers/redis-kv-writer";
import type { WeatherData } from "@pitwall/types";

export class WeatherPoller extends BasePoller {
  constructor() {
    super("weather", 60_000);
  }

  protected async onData(data: any[]): Promise<void> {
    const latest = data[data.length - 1];
    if (!latest) return;

    const weather: WeatherData = {
      airTemperature: latest.air_temperature ?? 0,
      trackTemperature: latest.track_temperature ?? 0,
      humidity: latest.humidity ?? 0,
      pressure: latest.pressure ?? 0,
      windSpeed: latest.wind_speed ?? 0,
      windDirection: latest.wind_direction ?? 0,
      rainfall: Boolean(latest.rainfall),
    };

    await redisKvWriter.setWeather(weather);
  }
}

import Redis from "ioredis";
import { logger } from "./lib/logger";

interface ConsumerCallbacks {
  onStandings: (data: any) => void;
  onPositions: (data: any) => void;
  onTelemetry: (driverNumber: number, data: any) => void;
  onRaceControl: (msg: any) => void;
  onTeamRadio: (msg: any) => void;
  onPit: (evt: any) => void;
  onTrackStatus: (status: any) => void;
  onSessionState: (session: any) => void;
  onWeather: (weather: any) => void;
  onLap: (lap: { current: number; total: number }) => void;
}

export class RedisConsumer {
  private redisSub: Redis;
  private redisStream: Redis;
  private redisKv: Redis;
  private callbacks: ConsumerCallbacks;
  private running = false;
  private lastSessionRaw: string | null = null;
  private lastWeatherRaw: string | null = null;
  private lastLapRaw: string | null = null;
  private lastStandingsRaw: string | null = null;

  constructor(callbacks: ConsumerCallbacks) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.redisSub = new Redis(redisUrl);     // For Pub/Sub
    this.redisStream = new Redis(redisUrl);  // For Streams
    this.redisKv = new Redis(redisUrl);      // For KV polling
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    this.running = true;

    // 1. Subscribe to Pub/Sub channels
    await this.redisSub.subscribe(
      "channel:race_control",
      "channel:team_radio",
      "channel:pit",
      "channel:track_status"
    );

    this.redisSub.on("message", (channel, message) => {
      const data = JSON.parse(message);
      switch (channel) {
        case "channel:race_control": this.callbacks.onRaceControl(data); break;
        case "channel:team_radio": this.callbacks.onTeamRadio(data); break;
        case "channel:pit": this.callbacks.onPit(data); break;
        case "channel:track_status": this.callbacks.onTrackStatus(data); break;
      }
    });

    // 2. Poll KV for standings (simpler than streams for state data)
    this.pollKv();

    // 3. Read Streams for positions and telemetry
    this.readPositionStream();
    this.readTelemetryStreams();

    logger.info("Redis consumer started");
  }

  private async pollKv(): Promise<void> {
    while (this.running) {
      try {
        const [standings, sessionRaw, weatherRaw, lapRaw] = await Promise.all([
          this.redisKv.get("live:standings"),
          this.redisKv.get("live:session:info"),
          this.redisKv.get("live:weather"),
          this.redisKv.get("live:lap"),
        ]);

        if (standings && standings !== this.lastStandingsRaw) {
          this.lastStandingsRaw = standings;
          const parsed = JSON.parse(standings);
          const payload = Array.isArray(parsed) ? { standings: parsed } : parsed;
          this.callbacks.onStandings(payload);
        }

        if (sessionRaw && sessionRaw !== this.lastSessionRaw) {
          this.lastSessionRaw = sessionRaw;
          this.callbacks.onSessionState(JSON.parse(sessionRaw));
        }

        if (weatherRaw && weatherRaw !== this.lastWeatherRaw) {
          this.lastWeatherRaw = weatherRaw;
          this.callbacks.onWeather(JSON.parse(weatherRaw));
        }

        if (lapRaw && lapRaw !== this.lastLapRaw) {
          this.lastLapRaw = lapRaw;
          this.callbacks.onLap(JSON.parse(lapRaw));
        }
      } catch (err) {
        logger.error({ err }, "KV poll error");
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  private async readPositionStream(): Promise<void> {
    let lastId = "$"; // Only new messages
    while (this.running) {
      try {
        const results = await this.redisStream.xread(
          "COUNT", 10, "BLOCK", 200,
          "STREAMS", "stream:positions", lastId
        ) as any;
        if (results) {
          for (const [, messages] of results) {
            for (const [id, fields] of messages) {
              lastId = id;
              const data = JSON.parse(fields[1]); // fields = ["data", "{...}"]
              this.callbacks.onPositions(data);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Position stream read error");
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  private async readTelemetryStreams(): Promise<void> {
    // Track which car streams exist and read them
    let lastIds: Record<string, string> = {};
    while (this.running) {
      try {
        // Discover active car streams
        const keys = await this.redisStream.keys("stream:telemetry:car:*");
        for (const key of keys) {
          if (!lastIds[key]) lastIds[key] = "$";
        }

        if (Object.keys(lastIds).length === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        const streams = Object.keys(lastIds);
        const ids = Object.values(lastIds);

        const results = await this.redisStream.xread(
          "COUNT", 20, "BLOCK", 200,
          "STREAMS", ...streams, ...ids
        ) as any;

        if (results) {
          for (const [stream, messages] of results) {
            const driverNum = parseInt(stream.split(":").pop()!);
            for (const [id, fields] of messages) {
              lastIds[stream] = id;
              const data = JSON.parse(fields[1]);
              this.callbacks.onTelemetry(driverNum, data);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Telemetry stream read error");
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.redisSub.unsubscribe();
    this.redisSub.disconnect();
    this.redisStream.disconnect();
    this.redisKv.disconnect();
  }
}

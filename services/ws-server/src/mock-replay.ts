import fs from "fs";
import { Server } from "socket.io";
import { logger } from "./lib/logger";

interface RecordedFrame {
  timestamp: number;  // ms offset from start
  event: string;      // "standings" | "positions" | "race_control" | etc.
  data: any;
}

export class MockReplay {
  private frames: RecordedFrame[] = [];
  private currentIndex = 0;
  private startTime = 0;
  private timer: NodeJS.Timeout | null = null;
  private speed = 1; // Playback speed multiplier

  constructor(private io: Server) {}

  loadRecording(filePath: string): void {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      this.frames = JSON.parse(raw);
      logger.info({ frames: this.frames.length, file: filePath }, "Loaded recording");
    } catch (err) {
      logger.error({ err, filePath }, "Failed to load recording");
    }
  }

  start(speed = 1): void {
    if (this.frames.length === 0) {
      logger.warn("No frames loaded to replay");
      return;
    }
    this.speed = speed;
    this.currentIndex = 0;
    this.startTime = Date.now();
    this.scheduleNext();
    logger.info({ speed }, "Mock replay started");
  }

  private scheduleNext(): void {
    if (this.currentIndex >= this.frames.length) {
      logger.info("Replay complete, looping...");
      this.currentIndex = 0;
      this.startTime = Date.now();
    }

    const frame = this.frames[this.currentIndex];
    const elapsed = Date.now() - this.startTime;
    const waitMs = Math.max(0, (frame.timestamp / this.speed) - elapsed);

    this.timer = setTimeout(() => {
      // Emit to appropriate room
      switch (frame.event) {
        case "standings":
          this.io.to("live:race").emit("standings", frame.data);
          break;
        case "positions":
          this.io.to("live:map").emit("positions", frame.data);
          break;
        case "race_control":
          this.io.to("live:events").emit("race_control", frame.data);
          break;
        case "team_radio":
          this.io.to("live:events").emit("team_radio", frame.data);
          break;
        case "track_status":
          this.io.to("live:events").emit("track_status", frame.data);
          break;
      }

      this.currentIndex++;
      this.scheduleNext();
    }, waitMs);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}

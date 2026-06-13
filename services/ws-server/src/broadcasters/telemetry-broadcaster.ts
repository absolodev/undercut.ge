import { Server } from "socket.io";
import { ThrottledEmitter } from "../throttle";

export class TelemetryBroadcaster {
  private emitters: Map<number, ThrottledEmitter<any>> = new Map();

  constructor(private io: Server) {}

  enqueue(driverNumber: number, data: any): void {
    let emitter = this.emitters.get(driverNumber);
    if (!emitter) {
      emitter = new ThrottledEmitter(
        (latest) => this.io.to(`live:telemetry:car:${driverNumber}`).emit("telemetry", latest),
        200 // 5Hz
      );
      this.emitters.set(driverNumber, emitter);
    }
    emitter.enqueue(data);
  }
}

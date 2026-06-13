import { Server } from "socket.io";
import { ThrottledEmitter } from "../throttle";

export class PositionsBroadcaster {
  private emitter: ThrottledEmitter<any>;

  constructor(io: Server) {
    this.emitter = new ThrottledEmitter(
      (data) => io.to("live:map").emit("positions", data),
      200 // 5Hz
    );
  }

  enqueue(data: any): void {
    this.emitter.enqueue(data);
  }
}

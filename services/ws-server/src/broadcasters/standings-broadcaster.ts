import { Server } from "socket.io";
import { ThrottledEmitter } from "../throttle";

export class StandingsBroadcaster {
  private emitter: ThrottledEmitter<any>;

  constructor(io: Server) {
    this.emitter = new ThrottledEmitter(
      (data) => io.to("live:race").emit("standings", data),
      500 // 2Hz
    );
  }

  enqueue(data: any): void {
    this.emitter.enqueue(data);
  }
}

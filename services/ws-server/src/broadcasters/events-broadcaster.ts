import { Server } from "socket.io";

export class EventsBroadcaster {
  constructor(private io: Server) {}

  emitRaceControl(msg: any): void {
    this.io.to("live:events").emit("race_control", msg);
  }

  emitTeamRadio(msg: any): void {
    this.io.to("live:events").emit("team_radio", msg);
  }

  emitPit(evt: any): void {
    this.io.to("live:events").emit("pit", evt);
  }

  emitTrackStatus(status: any): void {
    this.io.to("live:events").emit("track_status", status);
  }

  emitSessionState(session: any): void {
    this.io.to("live:race").emit("session_state", session);
  }

  emitWeather(weather: any): void {
    this.io.to("live:race").emit("weather", weather);
  }

  emitLap(lap: { current: number; total: number }): void {
    this.io.to("live:race").emit("lap", lap);
  }
}

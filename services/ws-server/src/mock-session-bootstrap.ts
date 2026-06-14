import type { SessionBootstrapPayload } from "./session-bootstrap";
import { SessionBootstrap } from "./session-bootstrap";
import { buildDemoBootstrap } from "./lib/demo-data";
import type { SessionInfo } from "@pitwall/types";

const MOCK_SESSION: SessionInfo = {
  sessionKey: 0,
  sessionType: "R",
  sessionName: "Race",
  meetingName: "Mock Grand Prix",
  circuitName: "catalunya",
  circuitShortName: "Barcelona",
  countryName: "Spain",
  dateStart: new Date().toISOString(),
  dateEnd: null,
  totalLaps: 66,
};

export class MockSessionBootstrap extends SessionBootstrap {
  async getState(): Promise<SessionBootstrapPayload> {
    return buildDemoBootstrap(MOCK_SESSION);
  }
}

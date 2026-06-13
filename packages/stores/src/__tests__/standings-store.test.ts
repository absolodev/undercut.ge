import { describe, it, expect, beforeEach } from "vitest";
import { useStandingsStore } from "../standings-store";

describe("useStandingsStore", () => {
  beforeEach(() => {
    useStandingsStore.setState({ standings: [], previousPositions: new Map() });
  });

  it("sets standings", () => {
    const standings = [
      { driverNumber: 1, position: 1, broadcastName: "VER", gapToLeader: "LEADER" },
      { driverNumber: 4, position: 2, broadcastName: "NOR", gapToLeader: "+1.234" },
    ] as any;

    useStandingsStore.getState().setStandings(standings);
    expect(useStandingsStore.getState().standings).toHaveLength(2);
    expect(useStandingsStore.getState().standings[0].broadcastName).toBe("VER");
  });

  it("tracks previous positions on update", () => {
    const initial = [{ driverNumber: 1, position: 1 }] as any;
    const updated = [{ driverNumber: 1, position: 2 }] as any;

    useStandingsStore.getState().setStandings(initial);
    useStandingsStore.getState().setStandings(updated);

    expect(useStandingsStore.getState().previousPositions.get(1)).toBe(1);
  });
});

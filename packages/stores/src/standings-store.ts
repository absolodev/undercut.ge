import { create } from "zustand";
import type { LiveStanding } from "@pitwall/types";

interface StandingsState {
  standings: LiveStanding[];
  previousPositions: Map<number, number>; // driverNumber → previous position
  setStandings: (standings: LiveStanding[]) => void;
}

export const useStandingsStore = create<StandingsState>((set, get) => ({
  standings: [],
  previousPositions: new Map(),

  setStandings: (newStandings) => {
    const prev = get().standings;
    const prevMap = new Map<number, number>();
    for (const s of prev) {
      prevMap.set(s.driverNumber, s.position);
    }
    set({ standings: newStandings, previousPositions: prevMap });
  },
}));

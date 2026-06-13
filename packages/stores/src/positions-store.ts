import { create } from "zustand";
import type { CarPosition } from "@pitwall/types";

interface PositionsState {
  positions: CarPosition[];
  previousPositions: CarPosition[];  // For interpolation
  lastUpdateTime: number;
  setPositions: (positions: CarPosition[]) => void;
}

export const usePositionsStore = create<PositionsState>((set, get) => ({
  positions: [],
  previousPositions: [],
  lastUpdateTime: Date.now(),

  setPositions: (newPositions) => {
    set({
      previousPositions: get().positions,
      positions: newPositions,
      lastUpdateTime: Date.now(),
    });
  },
}));

import { create } from "zustand";
import type { RaceControlMessage } from "@pitwall/types";

interface RaceControlState {
  messages: RaceControlMessage[];
  addMessage: (msg: RaceControlMessage) => void;
}

export const useRaceControlStore = create<RaceControlState>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => ({
      messages: [msg, ...state.messages].slice(0, 100), // Keep last 100
    })),
}));

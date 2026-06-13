import { create } from "zustand";

interface TeamRadioState {
  messages: any[];
  addMessage: (msg: any) => void;
}

export const useTeamRadioStore = create<TeamRadioState>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => ({
      messages: [msg, ...state.messages].slice(0, 50),
    })),
}));

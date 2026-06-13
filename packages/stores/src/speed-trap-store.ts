import { create } from "zustand";

interface SpeedTrapState {
  topSpeeds: Array<{ driverNumber: number; broadcastName: string; speed: number }>;
  setTopSpeeds: (speeds: any[]) => void;
}

export const useSpeedTrapStore = create<SpeedTrapState>((set) => ({
  topSpeeds: [],
  setTopSpeeds: (speeds) => set({ topSpeeds: speeds }),
}));

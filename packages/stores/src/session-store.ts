import { create } from "zustand";
import type { SessionType, TrackStatus } from "@pitwall/types";

interface SessionState {
  sessionType: SessionType | null;
  sessionName: string;
  meetingName: string;
  circuitName: string;
  currentLap: number;
  totalLaps: number;
  trackStatus: TrackStatus;
  drsEnabled: boolean;
  setSession: (data: Partial<SessionState>) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionType: null,
  sessionName: "",
  meetingName: "",
  circuitName: "catalunya",
  currentLap: 0,
  totalLaps: 0,
  trackStatus: "GREEN",
  drsEnabled: false,
  setSession: (data) => set(data),
}));

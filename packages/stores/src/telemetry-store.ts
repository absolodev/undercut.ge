import { create } from "zustand";

interface TelemetryState {
  telemetry: any | null;
  setTelemetry: (data: any) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  telemetry: null,
  setTelemetry: (data) => set({ telemetry: data }),
}));

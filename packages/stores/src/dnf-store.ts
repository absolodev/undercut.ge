import { create } from "zustand";

interface DnfState {
  dnfs: Array<{ driverNumber: number; broadcastName: string; lap: number; reason: string }>;
  addDnf: (dnf: any) => void;
}

export const useDnfStore = create<DnfState>((set) => ({
  dnfs: [],
  addDnf: (dnf) => set((s) => ({ dnfs: [...s.dnfs, dnf] })),
}));

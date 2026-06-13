import { create } from "zustand";

interface UIState {
  selectedDriver: number | null;
  isFullscreen: boolean;
  isProMode: boolean;
  visibleColumns: Set<string>;
  setSelectedDriver: (num: number | null) => void;
  toggleFullscreen: () => void;
  toggleProMode: () => void;
  toggleColumn: (col: string) => void;
}

const DEFAULT_COLUMNS = new Set([
  "position", "team", "driver", "gap", "interval",
  "lastLap", "s1", "s2", "s3", "tire", "age", "pit", "penalty"
]);

export const useUIStore = create<UIState>((set) => ({
  selectedDriver: null,
  isFullscreen: false,
  isProMode: false,
  visibleColumns: DEFAULT_COLUMNS,
  setSelectedDriver: (num) => set({ selectedDriver: num }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  toggleProMode: () => set((s) => ({ isProMode: !s.isProMode })),
  toggleColumn: (col) => set((s) => {
    const cols = new Set(s.visibleColumns);
    cols.has(col) ? cols.delete(col) : cols.add(col);
    return { visibleColumns: cols };
  }),
}));

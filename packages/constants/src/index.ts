import type { PenaltyType, SectorColor, TireCompound, TrackStatus } from "@pitwall/types";

// UI Colors for Teams (fallback defaults, mostly loaded from DB)
export const TEAM_COLORS: Record<string, string> = {
  RedBull: "#3671C6",
  Mercedes: "#27F4D2",
  Ferrari: "#E8002D",
  McLaren: "#FF8000",
  AstonMartin: "#229971",
  Alpine: "#0093CC",
  Williams: "#37BEDD",
  VCARB: "#6692FF",
  Sauber: "#52E252",
  Haas: "#B6BABD",
};

// Tire Compound Colors
export const TIRE_COLORS: Record<TireCompound, string> = {
  SOFT: "#FF3333", // Red
  MEDIUM: "#FFD12E", // Yellow
  HARD: "#FFFFFF", // White
  INTERMEDIATE: "#39B54A", // Green
  WET: "#00A0DE", // Blue
};

// Flag Colors
export const FLAG_COLORS: Record<TrackStatus, string> = {
  GREEN: "#00FF00",
  YELLOW: "#FFD700",
  DOUBLE_YELLOW: "#FFD700",
  SC: "#FFA500",
  VSC: "#FFA500",
  RED: "#FF0000",
};

// Sector Colors
export const SECTOR_UI_COLORS: Record<SectorColor, string> = {
  purple: "#b026ff",
  green: "#00ff00",
  yellow: "#ffd700",
  red: "#ff0000",
  none: "#555555",
};

// Penalty Labels & Icons
export const PENALTY_LABELS: Record<PenaltyType, { label: string; icon: string; description: string }> = {
  "5_SEC": { label: "5 Second Time Penalty", icon: "⏱️", description: "5 seconds added to race time or served at pit stop" },
  "10_SEC": { label: "10 Second Time Penalty", icon: "⏱️", description: "10 seconds added to race time or served at pit stop" },
  "DRIVE_THROUGH": { label: "Drive Through Penalty", icon: "🚗", description: "Must drive through pit lane without stopping" },
  "STOP_GO_5": { label: "10 Second Stop & Go", icon: "🛑", description: "Must stop in pit box for 10 seconds, no tyre changes allowed" },
  "STOP_GO_10": { label: "10 Second Stop & Go", icon: "🛑", description: "Must stop in pit box for 10 seconds, no tyre changes allowed" },
  "GRID_3": { label: "3 Place Grid Penalty", icon: "🏁", description: "3 places dropped on the starting grid" },
  "GRID_5": { label: "5 Place Grid Penalty", icon: "🏁", description: "5 places dropped on the starting grid" },
  "GRID_10": { label: "10 Place Grid Penalty", icon: "🏁", description: "10 places dropped on the starting grid" },
  "DSQ": { label: "Disqualified", icon: "❌", description: "Disqualified from the session" },
  "REPRIMAND": { label: "Reprimand", icon: "⚠️", description: "Official warning. 3 reprimands in a season = 10 place grid penalty" },
  "WARNING": { label: "Warning", icon: "⚠️", description: "Official warning" },
  "TRACK_LIMITS": { label: "Track Limits Warning", icon: "⚫", description: "Warning for exceeding track limits" },
  "BLACK_WHITE_FLAG": { label: "Black & White Flag", icon: "🏁", description: "Warning for unsportsmanlike behavior" },
};

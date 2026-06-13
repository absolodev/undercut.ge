// ─── Core F1 Data Types ───────────────────────────────────────
// These mirror the database schema and are used throughout the app.

// ─── Driver ───────────────────────────────────────────────────
export interface Driver {
  id: number;
  driverRef: string;
  broadcastName: string; // 'VER', 'HAM', 'NOR'
  firstName: string;
  lastName: string;
  fullName: string;
  permanentNumber: number | null;
  dateOfBirth: string | null;
  nationality: string | null;
  countryCode: string | null;
  headshotUrl: string | null;
  isActive: boolean;
}

// ─── Constructor / Team ───────────────────────────────────────
export interface Constructor {
  id: number;
  constructorRef: string;
  name: string;
  fullName: string | null;
  nationality: string | null;
  colorPrimary: string;
  colorSecondary: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

// ─── Tire Compounds ───────────────────────────────────────────
export type TireCompound = "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET";

// ─── Track / Flag Status ──────────────────────────────────────
export type TrackStatus = "GREEN" | "YELLOW" | "DOUBLE_YELLOW" | "SC" | "VSC" | "RED";

// ─── Session Types ────────────────────────────────────────────
export type SessionType = "FP1" | "FP2" | "FP3" | "Q" | "SQ" | "S" | "R";

// ─── Sector Timing Colors ────────────────────────────────────
export type SectorColor = "purple" | "green" | "yellow" | "red" | "none";

// ─── Live Standings (Timing Tower Row) ────────────────────────
export interface LiveStanding {
  driverNumber: number;
  position: number;
  broadcastName: string;
  teamName: string;
  teamColor: string;
  gapToLeader: string;
  interval: string;
  lastLapMs: number | null;
  sector1Ms: number | null;
  sector2Ms: number | null;
  sector3Ms: number | null;
  sector1Color: SectorColor;
  sector2Color: SectorColor;
  sector3Color: SectorColor;
  compound: TireCompound | null;
  tyreAge: number;
  pitStops: number;
  penalties: Penalty[];
  isInPit: boolean;
  isRetired: boolean;
  retirementReason?: string;
  hasFastestLap: boolean;
}

// ─── Penalty ──────────────────────────────────────────────────
export type PenaltyType =
  | "5_SEC"
  | "10_SEC"
  | "DRIVE_THROUGH"
  | "STOP_GO_5"
  | "STOP_GO_10"
  | "GRID_3"
  | "GRID_5"
  | "GRID_10"
  | "DSQ"
  | "REPRIMAND"
  | "WARNING"
  | "TRACK_LIMITS"
  | "BLACK_WHITE_FLAG";

export interface Penalty {
  type: PenaltyType;
  reason: string;
  lap: number;
  timeAddedSec?: number;
  gridPlaces?: number;
  regulationRef?: string;
  isServed: boolean;
}

// ─── Car Position (Track Map) ─────────────────────────────────
export interface CarPosition {
  driverNumber: number;
  x: number;
  y: number;
  z: number;
}

// ─── Car Telemetry ────────────────────────────────────────────
export interface CarTelemetry {
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: boolean;
  drs: number; // 0=off, 1=available, 2=active
}

// ─── Weather ──────────────────────────────────────────────────
export interface WeatherData {
  airTemperature: number;
  trackTemperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  rainfall: boolean;
}

// ─── Race Control Messages ────────────────────────────────────
export type RaceControlCategory =
  | "Flag"
  | "SafetyCar"
  | "Penalty"
  | "Drs"
  | "Investigation"
  | "TrackLimits"
  | "Other";

export interface RaceControlMessage {
  id: string;
  lap: number;
  category: RaceControlCategory;
  flag?: string;
  message: string;
  driverNumber?: number;
  sector?: number;
  timestamp: string;
}

// ─── Team Radio ───────────────────────────────────────────────
export interface TeamRadioMessage {
  id: string;
  driverNumber: number;
  broadcastName: string;
  teamName: string;
  teamColor: string;
  recordingUrl?: string;
  lap: number;
  timestamp: string;
}

// ─── Session Info ─────────────────────────────────────────────
export interface SessionInfo {
  sessionKey: number;
  sessionType: SessionType;
  sessionName: string;
  meetingName: string;
  circuitName: string;
  circuitShortName: string;
  countryName: string;
  dateStart: string;
  dateEnd: string | null;
  totalLaps: number;
}

// ─── DNF Entry ────────────────────────────────────────────────
export interface DnfEntry {
  driverNumber: number;
  broadcastName: string;
  teamColor: string;
  lap: number;
  reason: string;
}

// ─── Speed Trap ───────────────────────────────────────────────
export interface SpeedTrapEntry {
  driverNumber: number;
  broadcastName: string;
  speed: number;
}

// ─── Pit Stop ─────────────────────────────────────────────────
export interface PitStopEvent {
  driverNumber: number;
  lap: number;
  durationMs: number;
  compoundFrom: TireCompound | null;
  compoundTo: TireCompound | null;
  positionBefore: number;
  positionAfter: number;
}

// ─── Circuit Map Data ─────────────────────────────────────────
export interface CircuitMapData {
  id: string;
  name: string;
  svgPath: string;
  pitLanePath?: string;
  viewBox: { x: number; y: number; width: number; height: number };
  transform: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
  drsZones: Array<{
    detectionPathSegment: string;
    activationPathSegment: string;
  }>;
  sectorBoundaries: Array<{
    position: { x: number; y: number };
    label: string;
  }>;
  corners: Array<{
    number: number;
    name?: string;
    position: { x: number; y: number };
  }>;
  startFinishLine: { x1: number; y1: number; x2: number; y2: number };
}

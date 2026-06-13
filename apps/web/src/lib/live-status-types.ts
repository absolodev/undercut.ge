import type { SessionType } from "@pitwall/types";

export type LivePageMode = "live" | "weekend" | "off-week";

export interface LiveSessionStatus {
  isLive: boolean;
  sessionType: SessionType | null;
  circuitName: string | null;
  circuitRef: string | null;
  meetingName: string | null;
  sessionName: string | null;
  countdownSeconds: number | null;
  weekendActive: boolean;
  mode: LivePageMode;
}

import { mapOpenF1Session, isSessionLive } from "./lib/session-utils";
import type { SessionBootstrapPayload } from "./session-bootstrap";
import { SessionBootstrap } from "./session-bootstrap";
import { openF1Fetch, hasOpenF1Credentials } from "./lib/openf1-client";
import { findLiveSessionFromJolpica, scheduledSessionToSessionInfo } from "./lib/jolpica";
import { buildDemoBootstrap } from "./lib/demo-data";
import { logger } from "./lib/logger";

function isEmptyBootstrap(state: SessionBootstrapPayload): boolean {
  return !state.session && !state.standings?.length;
}

export class ResilientSessionBootstrap extends SessionBootstrap {
  private cachedFallback: SessionBootstrapPayload | null = null;
  private fallbackExpiresAt = 0;

  async getState(): Promise<SessionBootstrapPayload> {
    const redisState = await super.getState();
    if (!isEmptyBootstrap(redisState)) return redisState;

    const now = Date.now();
    if (this.cachedFallback && this.fallbackExpiresAt > now) {
      return this.cachedFallback;
    }

    const fallback = await this.buildFallback();
    if (!isEmptyBootstrap(fallback)) {
      this.cachedFallback = fallback;
      this.fallbackExpiresAt = now + 15_000;
      logger.info(
        {
          session: fallback.session?.sessionName,
          source: hasOpenF1Credentials() ? "openf1" : "jolpica-demo",
        },
        "Serving fallback session bootstrap"
      );
    }

    return isEmptyBootstrap(fallback) ? redisState : fallback;
  }

  private async buildFallback(): Promise<SessionBootstrapPayload> {
    const seasonYear = parseInt(process.env.CURRENT_SEASON || String(new Date().getFullYear()), 10);

    if (hasOpenF1Credentials()) {
      const openF1State = await this.fetchFromOpenF1();
      if (!isEmptyBootstrap(openF1State)) return openF1State;
    }

    const jolpicaLive = await findLiveSessionFromJolpica(seasonYear);
    if (jolpicaLive) {
      return buildDemoBootstrap(scheduledSessionToSessionInfo(jolpicaLive));
    }

    return {
      session: null,
      lap: null,
      trackStatus: null,
      weather: null,
      standings: null,
    };
  }

  private async fetchFromOpenF1(): Promise<SessionBootstrapPayload> {
    const [sessions, positions, intervals, weather] = await Promise.all([
      openF1Fetch("sessions", { session_key: "latest" }),
      openF1Fetch("position", { session_key: "latest" }),
      openF1Fetch("intervals", { session_key: "latest" }),
      openF1Fetch("weather", { session_key: "latest" }),
    ]);

    if (!sessions.ok || !sessions.data.length) {
      return { session: null, lap: null, trackStatus: null, weather: null, standings: null };
    }

    const session = mapOpenF1Session(sessions.data[0] as Record<string, unknown>);
    if (!isSessionLive(session)) {
      return { session: null, lap: null, trackStatus: null, weather: null, standings: null };
    }
    const sessionKey = String(session.sessionKey);

    let standings: unknown[] | null = null;
    if (positions.ok && intervals.ok) {
      const [drivers, stints] = await Promise.all([
        openF1Fetch("drivers", { session_key: sessionKey }),
        openF1Fetch("stints", { session_key: sessionKey }),
      ]);
      if (drivers.ok) {
        standings = buildSimpleStandings(
          positions.data as PositionRow[],
          intervals.data as IntervalRow[],
          drivers.data as DriverRow[],
          stints.ok ? (stints.data as StintRow[]) : []
        );
      }
    }

    let weatherData: Record<string, unknown> | null = null;
    if (weather.ok && weather.data.length) {
      const w = weather.data[weather.data.length - 1] as Record<string, unknown>;
      weatherData = {
        airTemperature: w.air_temperature ?? 0,
        trackTemperature: w.track_temperature ?? 0,
        humidity: w.humidity ?? 0,
        pressure: w.pressure ?? 0,
        windSpeed: w.wind_speed ?? 0,
        windDirection: w.wind_direction ?? 0,
        rainfall: Boolean(w.rainfall),
      };
    }

    return {
      session,
      lap: session.totalLaps ? { current: 0, total: session.totalLaps } : null,
      trackStatus: { status: "GREEN" },
      weather: weatherData,
      standings,
    };
  }
}

interface PositionRow {
  driver_number: number;
  position: number;
  date: string;
}

interface IntervalRow {
  driver_number: number;
  gap_to_leader?: number | string | null;
  interval?: number | string | null;
}

interface DriverRow {
  driver_number: number;
  broadcast_name?: string;
  name_acronym?: string;
  team_name?: string;
  team_colour?: string;
}

interface StintRow {
  driver_number: number;
  compound?: string;
}

function buildSimpleStandings(
  positions: PositionRow[],
  intervals: IntervalRow[],
  drivers: DriverRow[],
  stints: StintRow[]
) {
  const latestPos = new Map<number, PositionRow>();
  for (const row of positions) {
    const existing = latestPos.get(row.driver_number);
    if (!existing || row.date > existing.date) latestPos.set(row.driver_number, row);
  }

  const intervalMap = new Map(intervals.map((i) => [i.driver_number, i]));
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
  const stintMap = new Map(stints.map((s) => [s.driver_number, s]));

  return Array.from(latestPos.values())
    .sort((a, b) => a.position - b.position)
    .map((pos) => {
      const driver = driverMap.get(pos.driver_number);
      const interval = intervalMap.get(pos.driver_number);
      const stint = stintMap.get(pos.driver_number);
      const isLeader = pos.position === 1;
      const gap = interval?.gap_to_leader;
      const gapStr =
        isLeader || gap == null
          ? isLeader
            ? "LEADER"
            : ""
          : typeof gap === "string"
            ? gap
            : `+${gap.toFixed(3)}s`;

      return {
        driverNumber: pos.driver_number,
        position: pos.position,
        broadcastName: driver?.broadcast_name ?? driver?.name_acronym ?? String(pos.driver_number),
        teamName: driver?.team_name ?? "",
        teamColor: driver?.team_colour ? `#${driver.team_colour}` : "#888888",
        gapToLeader: gapStr,
        interval: "",
        compound: stint?.compound?.toUpperCase().includes("SOFT")
          ? "SOFT"
          : stint?.compound?.toUpperCase().includes("MEDIUM")
            ? "MEDIUM"
            : "HARD",
        tyreAge: 0,
        pitStops: 0,
        penalties: [],
        isInPit: false,
        isRetired: false,
        hasFastestLap: false,
      };
    });
}

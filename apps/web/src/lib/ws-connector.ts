"use client";

import { useEffect } from "react";
import { getSocket } from "@pitwall/socket-client";
import type { SessionInfo, TrackStatus } from "@pitwall/types";
import {
  useStandingsStore,
  usePositionsStore,
  useWeatherStore,
  useRaceControlStore,
  useTeamRadioStore,
  useSessionStore,
} from "@pitwall/stores";

interface SessionBootstrapPayload {
  session: SessionInfo | null;
  lap: { current: number; total: number } | null;
  trackStatus: { status: string; message?: string } | null;
  weather: Parameters<ReturnType<typeof useWeatherStore.getState>["setWeather"]>[0] | null;
  standings: unknown[] | null;
}

function applySessionInfo(session: SessionInfo): void {
  useSessionStore.getState().setSession({
    sessionType: session.sessionType,
    sessionName: session.sessionName,
    meetingName: session.meetingName,
    circuitName: session.circuitName,
    totalLaps: session.totalLaps,
  });
}

export function useWebSocketConnection() {
  useEffect(() => {
    const socket = getSocket();

    const onBootstrap = (data: SessionBootstrapPayload) => {
      if (data.session) applySessionInfo(data.session);
      if (data.lap) {
        useSessionStore.getState().setSession({
          currentLap: data.lap.current,
          totalLaps: data.lap.total,
        });
      }
      if (data.trackStatus) {
        useSessionStore.getState().setSession({
          trackStatus: data.trackStatus.status as TrackStatus,
        });
      }
      if (data.weather) useWeatherStore.getState().setWeather(data.weather);
      if (data.standings) useStandingsStore.getState().setStandings(data.standings as never);
    };

    socket.on("session_bootstrap", onBootstrap);

    socket.on("session_state", (session: SessionInfo) => {
      applySessionInfo(session);
    });

    socket.on("weather", (weather) => {
      useWeatherStore.getState().setWeather(weather);
    });

    socket.on("lap", (lap: { current: number; total: number }) => {
      useSessionStore.getState().setSession({
        currentLap: lap.current,
        totalLaps: lap.total,
      });
    });

    socket.on("standings", (data) => {
      const standings = Array.isArray(data) ? data : data.standings;
      if (standings) useStandingsStore.getState().setStandings(standings);
      const lap = Array.isArray(data) ? null : data.lap;
      if (lap) useSessionStore.getState().setSession({ currentLap: lap.current, totalLaps: lap.total });
      const weather = Array.isArray(data) ? null : data.weather;
      if (weather) useWeatherStore.getState().setWeather(weather);
    });

    socket.on("positions", (data) => {
      usePositionsStore.getState().setPositions(data);
    });

    socket.on("race_control", (msg) => {
      useRaceControlStore.getState().addMessage(msg);
    });

    socket.on("team_radio", (msg) => {
      useTeamRadioStore.getState().addMessage(msg);
    });

    socket.on("track_status", (status) => {
      useSessionStore.getState().setSession({ trackStatus: status.status });
    });

    return () => {
      socket.off("session_bootstrap", onBootstrap);
      socket.off("session_state");
      socket.off("weather");
      socket.off("lap");
      socket.off("standings");
      socket.off("positions");
      socket.off("race_control");
      socket.off("team_radio");
      socket.off("track_status");
    };
  }, []);
}

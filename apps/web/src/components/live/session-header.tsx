"use client";

import { Link } from "@/i18n/navigation";
import { useSessionStore } from "@pitwall/stores";
import { FLAG_COLORS } from "@pitwall/constants";
import { useEffect, useState } from "react";
import { useWeatherWithFallback } from "@/hooks/use-weather-with-fallback";

export function SessionHeader() {
  const { trackStatus, sessionType, currentLap, totalLaps, drsEnabled, circuitName } = useSessionStore();
  const weather = useWeatherWithFallback();
  const [clock, setClock] = useState("");

  useEffect(() => {
    setClock(new Date().toLocaleTimeString());
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusColor = FLAG_COLORS[trackStatus] || "#00FF00";

  return (
    <div className="h-10 bg-bg-primary border-b border-border-default flex items-center px-4 gap-4 shrink-0 font-mono text-xs">
      <div className="flex items-center gap-2">
        <Link href="/" className="font-display text-sm font-bold tracking-wider text-f1-red hover:text-[#ff1a1a]">
          UNDERCUT
        </Link>
        <span className="text-text-muted">F1</span>
        {circuitName && (
          <span className="text-text-muted hidden sm:inline">· {circuitName}</span>
        )}
      </div>

      <div className="w-px h-5 bg-border-default" />

      {/* Track status */}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
        <span className="uppercase font-semibold" style={{ color: statusColor }}>{trackStatus}</span>
      </div>

      {/* Session badge */}
      {sessionType && (
        <span className="bg-f1-red text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{sessionType}</span>
      )}

      {/* Lap counter */}
      {totalLaps > 0 && (
        <span className="tabular-nums">LAP <span className="font-bold">{currentLap}</span>/{totalLaps}</span>
      )}

      <div className="flex-1" />

      {/* Weather */}
      {weather && (
        <div className="flex items-center gap-3 text-text-secondary">
          <span>🌡️ {weather.airTemperature}°C</span>
          <span>🛤️ {weather.trackTemperature}°C</span>
          <span>💧 {weather.humidity}%</span>
          <span>💨 {weather.windSpeed} km/h</span>
          {weather.rainfall && <span className="text-flag-blue font-bold">🌧️ RAIN</span>}
        </div>
      )}

      {/* DRS */}
      <span className={drsEnabled ? "text-flag-green" : "text-text-muted"}>
        DRS {drsEnabled ? "ON" : "OFF"}
      </span>

      <div className="w-px h-5 bg-border-default" />

      {/* Clock */}
      <span className="text-text-muted tabular-nums">{clock}</span>
    </div>
  );
}

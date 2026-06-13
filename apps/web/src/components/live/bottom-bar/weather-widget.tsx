"use client";

import { useWeatherWithFallback } from "@/hooks/use-weather-with-fallback";

export function WeatherWidget() {
  const weather = useWeatherWithFallback();

  return (
    <div className="shrink-0">
      <div className="text-[9px] text-text-muted uppercase mb-0.5">Weather</div>
      <div className="text-[10px] font-mono text-text-secondary">
        {weather ? (
          <>
            AIR {weather.airTemperature}°C · TRACK {weather.trackTemperature}°C
            {weather.rainfall ? " · RAIN" : ""}
          </>
        ) : (
          "N/A"
        )}
      </div>
    </div>
  );
}

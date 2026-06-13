"use client";

import type { WeatherData } from "@pitwall/types";
import { useWeatherWithFallback } from "@/hooks/use-weather-with-fallback";

export function WeatherPreviewCard({ initialWeather }: { initialWeather?: (WeatherData & { source?: string }) | null }) {
  const weather = useWeatherWithFallback() ?? initialWeather;

  if (!weather) {
    return (
      <div className="bg-[#111] border border-dashed border-white/20 rounded-lg p-5">
        <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider mb-2">Weather Forecast</h2>
        <p className="text-sm text-white/40">
          Forecast will appear when a race weekend is scheduled and circuit coordinates are available.
        </p>
      </div>
    );
  }

  const isLive = "source" in weather && weather.source === "live";

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider">Weather</h2>
        <span className="text-[10px] font-mono text-white/30 uppercase">
          {isLive ? "Live session" : "Forecast"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm font-mono">
        <div>
          <p className="text-white/40 text-[10px]">Air</p>
          <p className="font-bold">{weather.airTemperature}°C</p>
        </div>
        <div>
          <p className="text-white/40 text-[10px]">Track</p>
          <p className="font-bold">{weather.trackTemperature}°C</p>
        </div>
        <div>
          <p className="text-white/40 text-[10px]">Humidity</p>
          <p>{weather.humidity}%</p>
        </div>
        <div>
          <p className="text-white/40 text-[10px]">Wind</p>
          <p>{weather.windSpeed} km/h</p>
        </div>
      </div>
      {weather.rainfall && (
        <p className="mt-3 text-xs font-mono text-sky-400 font-bold">Rain expected</p>
      )}
    </div>
  );
}

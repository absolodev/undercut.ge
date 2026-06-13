"use client";

import { useEffect, useState } from "react";
import { useWeatherStore } from "@pitwall/stores";
import type { WeatherData } from "@pitwall/types";

type WeatherSnapshot = WeatherData & { source?: "live" | "forecast"; circuitName?: string };

export function useWeatherWithFallback() {
  const storeWeather = useWeatherStore((s) => s.weather);
  const [fallback, setFallback] = useState<WeatherSnapshot | null>(null);

  useEffect(() => {
    if (storeWeather) return;

    let cancelled = false;
    fetch("/api/live/weather")
      .then((res) => res.json())
      .then((data: { weather: WeatherSnapshot | null }) => {
        if (!cancelled && data.weather) {
          setFallback(data.weather);
          useWeatherStore.getState().setWeather(data.weather);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [storeWeather]);

  return storeWeather ?? fallback;
}

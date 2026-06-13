import type { WeatherData } from "@pitwall/types";
import { readLiveKv } from "@/lib/redis";
import { prisma } from "@pitwall/db";
import { CURRENT_SEASON } from "@/lib/config";

export type WeatherSnapshot = WeatherData & {
  source: "live" | "forecast";
  circuitName?: string;
};

async function fetchOpenMeteoForecast(lat: number, lng: number): Promise<WeatherSnapshot | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation"
    );

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        surface_pressure?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        precipitation?: number;
      };
    };

    const current = data.current;
    if (!current) return null;

    return {
      airTemperature: Math.round(current.temperature_2m ?? 0),
      trackTemperature: Math.round((current.temperature_2m ?? 0) + 8),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      pressure: Math.round(current.surface_pressure ?? 0),
      windSpeed: Math.round((current.wind_speed_10m ?? 0) * 3.6),
      windDirection: Math.round(current.wind_direction_10m ?? 0),
      rainfall: (current.precipitation ?? 0) > 0,
      source: "forecast",
    };
  } catch {
    return null;
  }
}

async function getWeekendCircuitCoords() {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 3);

  const race = await prisma.f1_races.findFirst({
    where: {
      season_year: CURRENT_SEASON,
      sessions: {
        some: {
          date_start: { lte: now },
          OR: [{ date_end: null }, { date_end: { gte: windowStart } }],
        },
      },
    },
    orderBy: { race_date: "asc" },
    include: { circuit: { select: { name: true, lat: true, lng: true } } },
  });

  if (race?.circuit?.lat != null && race.circuit.lng != null) {
    return { name: race.circuit.name, lat: race.circuit.lat, lng: race.circuit.lng };
  }

  const nextRace = await prisma.f1_races.findFirst({
    where: { season_year: CURRENT_SEASON, race_date: { gte: now } },
    orderBy: { race_date: "asc" },
    include: { circuit: { select: { name: true, lat: true, lng: true } } },
  });

  if (nextRace?.circuit?.lat != null && nextRace.circuit.lng != null) {
    return { name: nextRace.circuit.name, lat: nextRace.circuit.lat, lng: nextRace.circuit.lng };
  }

  return null;
}

export async function getLiveWeather(): Promise<WeatherSnapshot | null> {
  const live = await readLiveKv<WeatherData>("live:weather");
  if (live) {
    return { ...live, source: "live" };
  }

  const circuit = await getWeekendCircuitCoords();
  if (!circuit) return null;

  const forecast = await fetchOpenMeteoForecast(circuit.lat, circuit.lng);
  if (!forecast) return null;

  return { ...forecast, circuitName: circuit.name };
}

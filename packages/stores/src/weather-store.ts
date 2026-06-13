import { create } from "zustand";
import type { WeatherData } from "@pitwall/types";

interface WeatherState {
  weather: WeatherData | null;
  setWeather: (data: WeatherData) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: null,
  setWeather: (data) => set({ weather: data }),
}));

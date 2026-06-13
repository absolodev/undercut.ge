import { CURRENT_SEASON } from "@/lib/config";

/** Earliest season shown in UI navigation and selectors. */
export const UI_MIN_SEASON = 2020;

const MIN_SEASON = UI_MIN_SEASON;
const MAX_SEASON = CURRENT_SEASON + 1;

export function parseSeasonYear(value: string | undefined | null): number {
  if (!value) return CURRENT_SEASON;
  const year = parseInt(value, 10);
  if (Number.isNaN(year) || year < MIN_SEASON || year > MAX_SEASON) {
    return CURRENT_SEASON;
  }
  return year;
}

export function getSeasonYears(): number[] {
  const years: number[] = [];
  for (let y = CURRENT_SEASON; y >= 2020; y--) {
    years.push(y);
  }
  return years;
}

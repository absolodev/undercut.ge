/** Current F1 season year. Set CURRENT_SEASON in repo root `.env` (see .env.example). */
export const CURRENT_SEASON = parseInt(
  process.env.CURRENT_SEASON ?? String(new Date().getFullYear()),
  10
);

export function getCurrentSeasonYear(): number {
  return CURRENT_SEASON;
}

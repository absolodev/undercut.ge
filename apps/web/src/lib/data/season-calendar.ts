import seasonCalendars from "@pitwall/data/current/season.json";

type CalendarRace = {
  round: number;
  name: string;
  date: string;
  circuitRef: string;
  status: "scheduled" | "cancelled";
};

type SeasonCalendar = {
  totalRounds: number;
  note?: string;
  races: CalendarRace[];
};

const calendars = seasonCalendars as Record<string, SeasonCalendar>;

/** Active (non-cancelled) rounds in the published calendar for a season year. */
export function getPublishedSeasonRoundCount(seasonYear: number): number | null {
  const calendar = calendars[String(seasonYear)];
  if (!calendar) return null;
  const active = calendar.races.filter((r) => r.status !== "cancelled");
  return active.length > 0 ? active.length : calendar.totalRounds;
}

export function getSeasonCalendar(seasonYear: number): SeasonCalendar | null {
  return calendars[String(seasonYear)] ?? null;
}

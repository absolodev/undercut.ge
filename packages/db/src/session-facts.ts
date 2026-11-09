export type JolpicaResultInput = {
  position?: string;
  positionText?: string;
  points?: string;
  laps?: string;
  status?: string;
  Time?: { millis?: string; time?: string };
  FastestLap?: {
    rank?: string;
    lap?: string;
    Time?: { time?: string };
    AverageSpeed?: { units?: string; speed?: string };
  };
};

export type MappedResultFields = {
  finish_position: number | null;
  position_text: string | null;
  points: number;
  laps: number;
  status: string | null;
  time_ms: number | null;
  time_str: string | null;
  fastest_lap: boolean;
  fastest_lap_time_ms: number | null;
  fastest_lap_speed: number | null;
  classification: string;
};

export function parseClockToMs(value: string | undefined | null): number | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
    return Math.round((minutes * 60 + seconds) * 1000);
  }
  if (parts.length === 3) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    if ([hours, minutes, seconds].some((n) => Number.isNaN(n))) return null;
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }
  return null;
}

export function mapJolpicaResult(row: JolpicaResultInput): MappedResultFields {
  const text = row.positionText ?? null;
  const classification =
    text === "R" ? "DNF" :
    text === "D" ? "DSQ" :
    text === "W" ? "DNS" :
    text === "E" ? "EX" :
    text === "F" ? "DNQ" :
    text === "N" ? "NC" :
    "Classified";
  const speed = row.FastestLap?.AverageSpeed?.speed;
  const parsedSpeed = speed != null && speed !== "" ? Number(speed) : null;
  return {
    finish_position: row.position ? Number(row.position) : null,
    position_text: text,
    points: row.points ? Number(row.points) : 0,
    laps: row.laps ? Number(row.laps) : 0,
    status: row.status ?? null,
    time_ms: row.Time?.millis ? Number(row.Time.millis) : null,
    time_str: row.Time?.time ?? null,
    fastest_lap: row.FastestLap?.rank === "1",
    fastest_lap_time_ms: parseClockToMs(row.FastestLap?.Time?.time),
    fastest_lap_speed: parsedSpeed != null && !Number.isNaN(parsedSpeed) ? parsedSpeed : null,
    classification,
  };
}

const OPENF1_COMPOUNDS = new Set(["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"]);

export function mapOpenF1Stint(row: {
  driver_number: number;
  stint_number: number;
  compound: string;
  lap_start: number;
  lap_end: number | null;
  tyre_age_at_start: number | null;
}) {
  const compound = row.compound?.toUpperCase();
  if (!OPENF1_COMPOUNDS.has(compound)) {
    throw new Error(`compound ${row.compound} is not an OpenF1 tyre`);
  }
  const endLap = typeof row.lap_end === "number" ? row.lap_end : null;
  return {
    stint_number: row.stint_number,
    compound,
    tyre_age_at_start: row.tyre_age_at_start ?? 0,
    start_lap: row.lap_start,
    end_lap: endLap,
    total_laps: endLap == null ? null : endLap - row.lap_start + 1,
  };
}

export function mapOpenF1Pit(row: {
  driver_number: number;
  lap_number: number;
  stop_duration?: number | null;
  pit_duration?: number | null;
  lane_duration?: number | null;
}) {
  const lane = row.lane_duration ?? row.pit_duration;
  return {
    lap_number: row.lap_number,
    duration_ms: row.stop_duration == null ? undefined : Math.round(row.stop_duration * 1000),
    pit_lane_time_ms: lane == null ? null : Math.round(lane * 1000),
  };
}

export function sessionTypesForPoints() {
  return ["R", "S"] as const;
}

export function mapWeather(row: {
  date: string;
  air_temperature?: number | null;
  track_temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  wind_speed?: number | null;
  wind_direction?: number | null;
  rainfall?: number | boolean | null;
}) {
  return {
    recorded_at: new Date(row.date),
    air_temp: row.air_temperature ?? null,
    track_temp: row.track_temperature ?? null,
    humidity: row.humidity ?? null,
    pressure: row.pressure ?? null,
    wind_speed: row.wind_speed ?? null,
    wind_direction: row.wind_direction ?? null,
    rainfall: Number(row.rainfall) === 1 || row.rainfall === true,
  };
}

export function mapRaceControl(row: {
  date: string;
  category?: string | null;
  flag?: string | null;
  message?: string | null;
  lap_number?: number | null;
  driver_number?: number | null;
  sector?: number | null;
}) {
  return {
    occurred_at: new Date(row.date),
    category: row.category ?? "Other",
    flag_status: row.flag ?? null,
    message: row.message ?? "",
    lap_number: row.lap_number ?? null,
    driver_number: row.driver_number ?? null,
    sector: row.sector ?? null,
  };
}

function secondsToMs(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 1000);
}

export function mapOpenF1Lap(row: {
  lap_number: number;
  lap_duration?: number | null;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  i1_speed?: number | null;
  i2_speed?: number | null;
  st_speed?: number | null;
  is_pit_out_lap?: boolean | null;
}) {
  return {
    lap_number: row.lap_number,
    lap_time_ms: secondsToMs(row.lap_duration),
    sector_1_ms: secondsToMs(row.duration_sector_1),
    sector_2_ms: secondsToMs(row.duration_sector_2),
    sector_3_ms: secondsToMs(row.duration_sector_3),
    i1_speed: row.i1_speed == null ? null : Math.round(row.i1_speed),
    i2_speed: row.i2_speed == null ? null : Math.round(row.i2_speed),
    st_speed: row.st_speed == null ? null : Math.round(row.st_speed),
    is_pit_out_lap: Boolean(row.is_pit_out_lap),
  };
}

export function assignQualifyingTimes(input: {
  messages: Array<{ date: string; qualifying_phase: number | null }>;
  laps: Array<{ driver_number: number; date_start: string; lap_duration: number | null }>;
}): Array<{
  driver_number: number;
  q1_time_ms: number | null;
  q2_time_ms: number | null;
  q3_time_ms: number | null;
}> {
  const phases = input.messages
    .filter((message) => message.qualifying_phase != null)
    .map((message) => ({
      at: new Date(message.date).getTime(),
      phase: message.qualifying_phase as number,
    }))
    .sort((a, b) => a.at - b.at);

  if (phases.length === 0) return [];

  const best = new Map<number, { q1: number | null; q2: number | null; q3: number | null }>();

  for (const lap of input.laps) {
    if (lap.lap_duration == null) continue;
    const at = new Date(lap.date_start).getTime();
    let phase: number | null = null;
    for (const item of phases) {
      if (item.at <= at) phase = item.phase;
      else break;
    }
    if (phase == null || phase < 1 || phase > 3) continue;
    const ms = Math.round(lap.lap_duration * 1000);
    const row = best.get(lap.driver_number) ?? { q1: null, q2: null, q3: null };
    const key = phase === 1 ? "q1" : phase === 2 ? "q2" : "q3";
    if (row[key] == null || ms < (row[key] as number)) row[key] = ms;
    best.set(lap.driver_number, row);
  }

  return [...best.entries()].map(([driver_number, row]) => ({
    driver_number,
    q1_time_ms: row.q1,
    q2_time_ms: row.q2,
    q3_time_ms: row.q3,
  }));
}

export type OpenF1SessionResultInput = {
  position?: number | null;
  driver_number?: number;
  number_of_laps?: number | null;
  points?: number | null;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  duration?: number | null;
  gap_to_leader?: number | null;
};

export function mapOpenF1SessionResult(row: OpenF1SessionResultInput) {
  let positionText: string | null;
  let classification: string;
  if (row.dsq) {
    positionText = "D";
    classification = "DSQ";
  } else if (row.dns) {
    positionText = "W";
    classification = "DNS";
  } else if (row.dnf) {
    positionText = "R";
    classification = "DNF";
  } else {
    positionText = row.position != null ? String(row.position) : null;
    classification = "Classified";
  }
  const gap = row.gap_to_leader;
  const timeStr = gap == null ? null : Number(gap) === 0 ? "leader" : `+${Number(gap).toFixed(3)}`;
  return {
    finish_position: row.position ?? null,
    laps: row.number_of_laps ?? 0,
    time_ms: typeof row.duration === "number" ? Math.round(row.duration * 1000) : null,
    time_str: timeStr,
    points: row.points ?? 0,
    position_text: positionText,
    classification,
    status: classification === "Classified" ? "Finished" : classification,
  };
}

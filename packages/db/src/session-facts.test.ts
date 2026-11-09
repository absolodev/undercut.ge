import { describe, expect, it } from "vitest";
import {
  assignQualifyingTimes,
  mapJolpicaResult,
  mapOpenF1Lap,
  mapOpenF1Pit,
  mapOpenF1SessionResult,
  mapOpenF1Stint,
  mapRaceControl,
  mapWeather,
  sessionTypesForPoints,
} from "./session-facts";

describe("mapJolpicaResult", () => {
  it("stores the winner time, the fastest lap, and a classified finish", () => {
    const mapped = mapJolpicaResult({
      position: "1",
      positionText: "1",
      points: "25",
      laps: "71",
      status: "Finished",
      Time: { millis: "5723504", time: "1:35:23.504" },
      FastestLap: { rank: "3", lap: "52", Time: { time: "1:12.983" } },
    });
    expect(mapped.time_ms).toBe(5723504);
    expect(mapped.time_str).toBe("1:35:23.504");
    expect(mapped.fastest_lap).toBe(false);
    expect(mapped.fastest_lap_time_ms).toBe(72983);
    expect(mapped.fastest_lap_speed).toBeNull();
    expect(mapped.classification).toBe("Classified");
  });

  it("marks rank 1 as the fastest lap and keeps AverageSpeed when present", () => {
    const mapped = mapJolpicaResult({
      position: "1",
      positionText: "1",
      points: "25",
      status: "Finished",
      FastestLap: {
        rank: "1",
        lap: "39",
        Time: { time: "1:32.608" },
        AverageSpeed: { units: "kph", speed: "210.383" },
      },
    });
    expect(mapped.fastest_lap).toBe(true);
    expect(mapped.fastest_lap_time_ms).toBe(92608);
    expect(mapped.fastest_lap_speed).toBeCloseTo(210.383);
  });

  it("classifies retirements without inventing a time", () => {
    expect(mapJolpicaResult({ positionText: "R", status: "Retired" }).classification).toBe("DNF");
    expect(mapJolpicaResult({ positionText: "D", status: "Disqualified" }).classification).toBe("DSQ");
    expect(mapJolpicaResult({ positionText: "W", status: "Did not start" }).classification).toBe("DNS");
    expect(mapJolpicaResult({ positionText: "R", status: "Retired" }).time_ms).toBeNull();
  });

  it("keeps a lapped finish classified", () => {
    expect(mapJolpicaResult({ position: "15", positionText: "15", status: "Lapped" }).classification).toBe(
      "Classified",
    );
  });
});

describe("OpenF1 stints, pits, and points", () => {
  it("maps an OpenF1 stint onto f1_stints columns", () => {
    expect(mapOpenF1Stint({
      driver_number: 77,
      stint_number: 1,
      compound: "INTERMEDIATE",
      lap_start: 1,
      lap_end: 1,
      tyre_age_at_start: 0,
    })).toEqual({
      stint_number: 1,
      compound: "INTERMEDIATE",
      tyre_age_at_start: 0,
      start_lap: 1,
      end_lap: 1,
      total_laps: 1,
    });
  });

  it("rejects a compound Jolpica invented", () => {
    expect(mapOpenF1Stint({
      driver_number: 1, stint_number: 1, compound: "MEDIUM",
      lap_start: 1, lap_end: 20, tyre_age_at_start: 0,
    }).compound).toBe("MEDIUM");
    expect(() => mapOpenF1Stint({
      driver_number: 1, stint_number: 1, compound: "UNKNOWN",
      lap_start: 1, lap_end: 20, tyre_age_at_start: 0,
    })).toThrow(/compound/);
  });

  it("splits the stationary stop from the lane time", () => {
    const pit = mapOpenF1Pit({
      driver_number: 44,
      lap_number: 14,
      stop_duration: 2.5,
      pit_duration: 24.394,
      lane_duration: 24.394,
    });
    expect(pit.duration_ms).toBe(2500);
    expect(pit.pit_lane_time_ms).toBe(24394);
    expect(pit.lap_number).toBe(14);
  });

  it("counts sprint points with race points", () => {
    expect(sessionTypesForPoints()).toEqual(["R", "S"]);
  });
});

describe("weather, race control, laps, and qualifying phases", () => {
  it("coerces rainfall 0/1 and keeps the snapshot timestamp", () => {
    const row = mapWeather({
      date: "2026-11-08T16:10:32.670000+00:00",
      air_temperature: 16.3,
      track_temperature: 43.6,
      humidity: 88.7,
      pressure: 930,
      wind_speed: 1.3,
      wind_direction: 178,
      rainfall: 0,
    });
    expect(row.rainfall).toBe(false);
    expect(row.air_temp).toBe(16.3);
    expect(row.recorded_at.toISOString()).toBe("2026-11-08T16:10:32.670Z");
  });

  it("maps a race-control message onto existing columns", () => {
    const row = mapRaceControl({
      date: "2026-11-08T16:13:18+00:00",
      category: "Other",
      flag: null,
      message: "LOW GRIP DELTA ACTIVE",
      lap_number: 1,
      driver_number: null,
      sector: null,
    });
    expect(row.category).toBe("Other");
    expect(row.flag_status).toBeNull();
    expect(row.message).toBe("LOW GRIP DELTA ACTIVE");
    expect(row.sector).toBeNull();
  });

  it("converts sector seconds without touching position", () => {
    const lap = mapOpenF1Lap({
      lap_number: 5,
      lap_duration: 87.47,
      duration_sector_1: 23.139,
      duration_sector_2: 40.1,
      duration_sector_3: 24.2,
      i1_speed: 236,
      i2_speed: 195,
      st_speed: 256,
      is_pit_out_lap: false,
    });
    expect(lap.lap_time_ms).toBe(87470);
    expect(lap.sector_1_ms).toBe(23139);
    expect(lap.st_speed).toBe(256);
    expect(lap).not.toHaveProperty("position");
  });

  it("buckets qualifying laps into Q1 Q2 Q3 from race-control phases", () => {
    const times = assignQualifyingTimes({
      messages: [
        { date: "2026-11-07T18:00:00+00:00", qualifying_phase: 1 },
        { date: "2026-11-07T19:49:00+00:00", qualifying_phase: 2 },
        { date: "2026-11-07T20:14:00+00:00", qualifying_phase: 3 },
      ],
      laps: [
        { driver_number: 1, date_start: "2026-11-07T18:10:00+00:00", lap_duration: 90.0 },
        { driver_number: 1, date_start: "2026-11-07T18:20:00+00:00", lap_duration: 88.2 },
        { driver_number: 1, date_start: "2026-11-07T19:55:00+00:00", lap_duration: 87.9 },
        { driver_number: 1, date_start: "2026-11-07T20:20:00+00:00", lap_duration: 87.47 },
      ],
    });
    expect(times).toEqual([{
      driver_number: 1,
      q1_time_ms: 88200,
      q2_time_ms: 87900,
      q3_time_ms: 87470,
    }]);
  });

  it("does not invent a segment when no phase is known", () => {
    expect(assignQualifyingTimes({
      messages: [{ date: "2026-11-07T18:00:00+00:00", qualifying_phase: null }],
      laps: [{ driver_number: 1, date_start: "2026-11-07T18:10:00+00:00", lap_duration: 87.47 }],
    })).toEqual([]);
  });
});

describe("mapOpenF1SessionResult", () => {
  it("stores a practice or sprint-qualifying classification", () => {
    expect(mapOpenF1SessionResult({
      position: 1,
      number_of_laps: 18,
      duration: 71.717,
      gap_to_leader: 0,
      points: 0,
    })).toMatchObject({
      finish_position: 1,
      laps: 18,
      time_ms: 71717,
      time_str: "leader",
      classification: "Classified",
      position_text: "1",
    });
    expect(mapOpenF1SessionResult({ dnf: true, position: 18, gap_to_leader: 1.25 }).classification).toBe("DNF");
    expect(mapOpenF1SessionResult({ dns: true }).position_text).toBe("W");
    expect(mapOpenF1SessionResult({ dsq: true }).classification).toBe("DSQ");
  });
});

import { describe, expect, it } from "vitest";
import {
  isActiveRaceWeekend,
  isRaceComplete,
  pickActiveWeekendRace,
  pickNextRace,
  raceStartInstant,
  type RaceTiming,
} from "../race-window";

const unitedStates: RaceTiming = {
  race_date: "2026-10-25",
  race_time: "1970-01-01T20:00:00.000Z",
  sessions: [
    { session_type: "FP1", date_start: "2026-10-23T17:30:00Z", date_end: "2026-10-23T18:30:00Z" },
    { session_type: "R", date_start: "2026-10-25T20:00:00Z", date_end: "2026-10-25T22:00:00Z" },
  ],
};

const mexico: RaceTiming = {
  race_date: "2026-11-01",
  race_time: "1970-01-01T20:00:00.000Z",
  sessions: [
    { session_type: "FP1", date_start: "2026-10-30T18:30:00Z", date_end: "2026-10-30T19:30:00Z" },
    { session_type: "R", date_start: "2026-11-01T20:00:00Z", date_end: "2026-11-01T22:00:00Z" },
  ],
};

/** Production rows used generic 11:30–14:00 times, but the race had still finished. */
const unitedStatesGenericTimes: RaceTiming = {
  race_date: "2026-10-25",
  race_time: "1970-01-01T20:00:00.000Z",
  sessions: [
    { session_type: "FP1", date_start: "2026-10-23T11:30:00Z", date_end: "2026-10-23T12:30:00Z" },
    { session_type: "R", date_start: "2026-10-25T13:00:00Z", date_end: "2026-10-25T14:00:00Z" },
  ],
};

describe("race weekend window", () => {
  const wednesday = new Date("2026-10-28T16:50:00Z");

  it("does not keep a finished grand prix as the active weekend", () => {
    expect(isRaceComplete(unitedStates, wednesday)).toBe(true);
    expect(isActiveRaceWeekend(unitedStates, wednesday)).toBe(false);
    expect(isRaceComplete(unitedStatesGenericTimes, wednesday)).toBe(true);
    expect(pickActiveWeekendRace([unitedStates, mexico], wednesday)).toBeNull();
  });

  it("selects the next race that has not finished", () => {
    expect(pickNextRace([unitedStates, mexico], wednesday)).toBe(mexico);
    expect(isActiveRaceWeekend(mexico, wednesday)).toBe(false);
  });

  it("treats the weekend as active from the first session day until the race buffer ends", () => {
    const fridayMorning = new Date("2026-10-30T12:00:00Z");
    const duringRace = new Date("2026-11-01T20:30:00Z");
    const insideBuffer = new Date("2026-11-01T22:20:00Z");
    const afterBuffer = new Date("2026-11-01T22:45:00Z");

    expect(isActiveRaceWeekend(mexico, fridayMorning)).toBe(true);
    expect(isRaceComplete(mexico, duringRace)).toBe(false);
    expect(isActiveRaceWeekend(mexico, insideBuffer)).toBe(true);
    expect(isRaceComplete(mexico, afterBuffer)).toBe(true);
    expect(isActiveRaceWeekend(mexico, afterBuffer)).toBe(false);
    expect(pickNextRace([mexico, { race_date: "2026-11-08", sessions: [] }], afterBuffer)?.race_date).toBe(
      "2026-11-08"
    );
  });

  it("uses the published race time when session rows are midnight placeholders", () => {
    const placeholder: RaceTiming = {
      race_date: "2026-10-25",
      race_time: "20:00:00",
      sessions: [
        { session_type: "R", date_start: "2026-10-25T00:00:00Z", date_end: "2026-10-25T00:00:00Z" },
      ],
    };
    expect(raceStartInstant(placeholder).toISOString()).toBe("2026-10-25T20:00:00.000Z");
    expect(isRaceComplete(placeholder, wednesday)).toBe(true);
    expect(isActiveRaceWeekend(placeholder, new Date("2026-10-24T12:00:00Z"))).toBe(true);
  });
});

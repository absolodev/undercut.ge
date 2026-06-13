import { describe, it, expect } from "vitest";
import { formatLapTime, formatGap, lerp } from "../index";

describe("formatLapTime", () => {
  it("formats sub-minute time", () => {
    expect(formatLapTime(83456)).toBe("1:23.456");
  });
  it("formats with minutes", () => {
    expect(formatLapTime(123456)).toBe("2:03.456");
  });
  it("handles null", () => {
    expect(formatLapTime(null)).toBe("—");
  });
});

describe("formatGap", () => {
  it("formats positive gap", () => {
    expect(formatGap(1.234)).toBe("+1.234");
  });
  it("handles string gap", () => {
    expect(formatGap("+1 LAP")).toBe("+1 LAP");
  });
});

describe("lerp", () => {
  it("interpolates at 0", () => expect(lerp(0, 100, 0)).toBe(0));
  it("interpolates at 0.5", () => expect(lerp(0, 100, 0.5)).toBe(50));
  it("interpolates at 1", () => expect(lerp(0, 100, 1)).toBe(100));
  it("clamps above 1", () => expect(lerp(0, 100, 1.5)).toBe(100));
});

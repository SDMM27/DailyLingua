import { describe, expect, it } from "vitest";
import { buildMockMission } from "@/lib/data/mock/mission";
import {
  checkBudget,
  completedMinutes,
  missionProgress,
  presetMinutes,
  splitBudget,
  totalMinutes,
  weightsToMinutes,
} from "./time-budget";

describe("splitBudget", () => {
  it("gives 20 min of Russian and 10 of Italian for 30 min at weights 2:1", () => {
    expect(
      splitBudget(30, [
        { language: "ru", weight: 2 },
        { language: "it", weight: 1 },
      ]),
    ).toEqual([
      { language: "ru", minutes: 20 },
      { language: "it", minutes: 10 },
    ]);
  });

  it("supports a single language", () => {
    expect(splitBudget(15, [{ language: "es", weight: 3 }])).toEqual([{ language: "es", minutes: 15 }]);
  });

  it("always sums to the total with three or more languages", () => {
    const weights = [
      { language: "ru", weight: 3 },
      { language: "it", weight: 2 },
      { language: "es", weight: 2 },
    ] as const;
    for (const total of [10, 25, 31, 45, 61]) {
      const split = splitBudget(total, weights);
      expect(split.reduce((s, x) => s + x.minutes, 0)).toBe(total);
    }
  });

  it("gives leftover minutes to the largest remainders", () => {
    // 10 * 1/3 = 3.33 each → 3 + 3 + 3, one leftover minute goes to the first.
    const split = splitBudget(10, [
      { language: "ru", weight: 1 },
      { language: "it", weight: 1 },
      { language: "de", weight: 1 },
    ]);
    expect(split.map((s) => s.minutes)).toEqual([4, 3, 3]);
  });

  it("rejects invalid input", () => {
    expect(() => splitBudget(0, [{ language: "ru", weight: 1 }])).toThrow(RangeError);
    expect(() => splitBudget(30, [])).toThrow(RangeError);
    expect(() => splitBudget(30, [{ language: "ru", weight: 0 }])).toThrow(RangeError);
  });
});

describe("splitBudget with minutes as weights", () => {
  it("returns the minutes exactly", () => {
    const goals = [
      { language: "ru", weight: 45 },
      { language: "it", weight: 30 },
      { language: "es", weight: 10 },
    ] as const;
    expect(splitBudget(totalMinutes(goals), goals)).toEqual([
      { language: "ru", minutes: 45 },
      { language: "it", minutes: 30 },
      { language: "es", minutes: 10 },
    ]);
  });
});

describe("totalMinutes", () => {
  it("sums the minutes of the languages", () => {
    expect(totalMinutes([{ weight: 20 }, { weight: 15 }])).toBe(35);
    expect(totalMinutes([])).toBe(0);
  });
});

describe("weightsToMinutes", () => {
  it("converts weights to multiples of 5 with a minimum of 10", () => {
    expect(
      weightsToMinutes(30, [
        { language: "ru", weight: 4 },
        { language: "it", weight: 1 },
        { language: "es", weight: 1 },
      ]),
    ).toEqual([
      { language: "ru", minutes: 20 },
      { language: "it", minutes: 10 },
      { language: "es", minutes: 10 },
    ]);
    expect(
      weightsToMinutes(30, [
        { language: "ru", weight: 2 },
        { language: "it", weight: 1 },
      ]),
    ).toEqual([
      { language: "ru", minutes: 20 },
      { language: "it", minutes: 10 },
    ]);
  });

  it("rounds to the nearest 5 minutes", () => {
    // 45 * 1/3 = 15, 45 * 2/3 = 30; 50 * 3/8 = 18.75 -> 20, 50 * 5/8 = 31.25 -> 30
    expect(weightsToMinutes(50, [{ language: "ru", weight: 3 }, { language: "it", weight: 5 }]).map((s) => s.minutes)).toEqual([20, 30]);
  });

  it("gives a single language its whole day", () => {
    expect(weightsToMinutes(25, [{ language: "ru", weight: 3 }])).toEqual([{ language: "ru", minutes: 25 }]);
  });

  it("trims the largest share until the day fits in 120 minutes", () => {
    const result = weightsToMinutes(120, [
      { language: "ru", weight: 20 },
      { language: "it", weight: 1 },
      { language: "es", weight: 1 },
      { language: "de", weight: 1 },
    ]);
    // 120*20/23 = 104.3 -> 105, others 5.2 -> 10: 105 + 30 = 135 > 120, trimmed on the first (largest) share.
    expect(result.map((s) => s.minutes)).toEqual([90, 10, 10, 10]);
    expect(result.reduce((sum, s) => sum + s.minutes, 0)).toBeLessThanOrEqual(120);
  });

  it("trims the first of two equal shares on a tie", () => {
    const result = weightsToMinutes(120, [
      { language: "ru", weight: 1 },
      { language: "it", weight: 1 },
    ]);
    expect(result.map((s) => s.minutes)).toEqual([60, 60]);
    const over = weightsToMinutes(120, [
      { language: "ru", weight: 100 },
      { language: "it", weight: 100 },
      { language: "es", weight: 1 },
    ]);
    // 59.7 -> 60, 60, 1.2 -> 10: 130 > 120 -> 55, 55 (tie: first, then the other).
    expect(over.map((s) => s.minutes)).toEqual([55, 55, 10]);
  });
});

describe("presetMinutes", () => {
  it("balanced splits the total equally", () => {
    expect(presetMinutes(30, ["ru", "it"], "balanced").map((s) => s.minutes)).toEqual([15, 15]);
    expect(presetMinutes(30, ["ru", "it", "es"], "balanced").map((s) => s.minutes)).toEqual([10, 10, 10]);
  });

  it("focus-first gives about two thirds to the first language", () => {
    expect(presetMinutes(30, ["ru", "it"], "focus-first")).toEqual([
      { language: "ru", minutes: 20 },
      { language: "it", minutes: 10 },
    ]);
    expect(presetMinutes(60, ["ru", "it", "es"], "focus-first").map((s) => s.minutes)).toEqual([40, 10, 10]);
  });

  it("keeps every share at 10 minutes or more, and the day within 120", () => {
    expect(presetMinutes(20, ["ru", "it", "es"], "focus-first").map((s) => s.minutes)).toEqual([15, 10, 10]);
    const big = presetMinutes(120, ["ru", "it", "es", "de"], "focus-first");
    expect(big.reduce((sum, s) => sum + s.minutes, 0)).toBeLessThanOrEqual(120);
    expect(big.every((s) => s.minutes >= 10 && s.minutes % 5 === 0)).toBe(true);
  });

  it("returns an equal share for a single language", () => {
    expect(presetMinutes(45, ["ru"], "focus-first")).toEqual([{ language: "ru", minutes: 45 }]);
    expect(presetMinutes(45, ["ru"], "balanced")).toEqual([{ language: "ru", minutes: 45 }]);
  });
});

describe("mission budget", () => {
  const mission = buildMockMission("2026-10-13");

  it("demo mission fits exactly in the 30 min budget", () => {
    expect(checkBudget(mission)).toEqual({
      plannedMinutes: 30,
      budgetMinutes: 30,
      withinBudget: true,
      overByMinutes: 0,
    });
  });

  it("reports overflow", () => {
    const tight = { ...mission, budgetMinutes: 25 };
    expect(checkBudget(tight)).toMatchObject({ withinBudget: false, overByMinutes: 5 });
  });

  it("computes progress from completed activities", () => {
    const done = new Set(["ru-read", "it-listen", "unknown-id"]);
    expect(completedMinutes(mission, done)).toBe(12);
    expect(missionProgress(mission, done)).toBeCloseTo(12 / 30);
    expect(missionProgress(mission, new Set())).toBe(0);
  });
});

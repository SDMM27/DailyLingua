import { describe, expect, it } from "vitest";
import { buildMockMission } from "@/lib/data/mock/mission";
import { checkBudget, completedMinutes, missionProgress, splitBudget } from "./time-budget";

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

import { describe, expect, it } from "vitest";
import { computeStreak, recentDays } from "./stats";

const TODAY = "2026-10-13";

describe("computeStreak", () => {
  it("counts consecutive days including today", () => {
    expect(computeStreak(["2026-10-13", "2026-10-12", "2026-10-11", "2026-10-09"], TODAY)).toBe(3);
  });

  it("keeps yesterday's streak alive before today's session", () => {
    expect(computeStreak(["2026-10-12", "2026-10-11"], TODAY)).toBe(2);
  });

  it("is zero when the last session is older than yesterday", () => {
    expect(computeStreak(["2026-10-10"], TODAY)).toBe(0);
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it("ignores duplicates", () => {
    expect(computeStreak(["2026-10-13", "2026-10-13", "2026-10-12"], TODAY)).toBe(2);
  });
});

describe("computeStreak with rest days", () => {
  // 2026-10-13 is a Tuesday; the learner works Monday, Wednesday and Friday.
  const MWF = new Set([1, 3, 5]);

  it("keeps the streak across the rest days", () => {
    const studied = ["2026-10-12", "2026-10-09", "2026-10-07", "2026-10-05"];
    expect(computeStreak(studied, TODAY, MWF)).toBe(4);
    // Without the weekdays, the same dates break at the first gap.
    expect(computeStreak(studied, TODAY)).toBe(1);
  });

  it("breaks on a missed worked day", () => {
    // Friday 9 was worked but not studied.
    expect(computeStreak(["2026-10-12", "2026-10-07"], TODAY, MWF)).toBe(1);
  });

  it("counts a studied rest day and starts from yesterday when today is a rest day", () => {
    expect(computeStreak(["2026-10-13", "2026-10-12"], TODAY, MWF)).toBe(2);
    // Today (Tuesday) is a rest day and not studied: the streak ends on Monday.
    expect(computeStreak(["2026-10-12", "2026-10-09"], TODAY, MWF)).toBe(2);
  });

  it("treats an empty set as every day, and ends when there is no study at all", () => {
    expect(computeStreak(["2026-10-12", "2026-10-11"], TODAY, new Set())).toBe(2);
    expect(computeStreak([], TODAY, new Set([8]))).toBe(0);
    expect(computeStreak(["2026-10-12"], TODAY, new Set([8]))).toBe(1);
  });
});

describe("recentDays", () => {
  it("returns 7 days ending today, oldest first", () => {
    const days = recentDays(["2026-10-12", "2026-10-07"], TODAY);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: "2026-10-07", studied: true, isToday: false });
    expect(days[6]).toEqual({ date: TODAY, studied: false, isToday: true });
    expect(days.filter((d) => d.studied)).toHaveLength(2);
  });
});

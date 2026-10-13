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

describe("recentDays", () => {
  it("returns 7 days ending today, oldest first", () => {
    const days = recentDays(["2026-10-12", "2026-10-07"], TODAY);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: "2026-10-07", studied: true, isToday: false });
    expect(days[6]).toEqual({ date: TODAY, studied: false, isToday: true });
    expect(days.filter((d) => d.studied)).toHaveLength(2);
  });
});

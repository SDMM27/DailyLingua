import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { ALL_WEEKDAYS, busiestDayMinutes, goalsForDate, minutesOnWeekday, workedDaysBefore } from "./schedule";

const ru = { language: "ru", weight: 20, days: [1, 2, 3, 4, 5, 6, 7] };
const ita = { language: "it", weight: 10, days: [1, 3, 5] };
const es = { language: "es", weight: 15, days: [3] };
const goals = [ru, ita, es];

describe("goalsForDate", () => {
  it("keeps the languages worked that weekday, in order", () => {
    expect(goalsForDate(goals, "2026-10-12").map((g) => g.language)).toEqual(["ru", "it"]); // Monday
    expect(goalsForDate(goals, "2026-10-13").map((g) => g.language)).toEqual(["ru"]); // Tuesday
    expect(goalsForDate(goals, "2026-10-14").map((g) => g.language)).toEqual(["ru", "it", "es"]); // Wednesday
  });

  it("is empty on a rest day", () => {
    expect(goalsForDate([ita, es], "2026-10-13")).toEqual([]);
  });
});

describe("minutesOnWeekday / busiestDayMinutes", () => {
  it("sums the minutes of the languages of each weekday", () => {
    expect(ALL_WEEKDAYS.map((d) => minutesOnWeekday(goals, d))).toEqual([30, 20, 45, 20, 30, 20, 20]);
  });

  it("is the total of the busiest day", () => {
    expect(busiestDayMinutes(goals)).toBe(45);
    expect(busiestDayMinutes([ru])).toBe(20);
    expect(busiestDayMinutes([])).toBe(0);
  });
});

describe("workedDaysBefore", () => {
  const naive = (days: number[], date: string) => {
    let count = 0;
    for (let d = "1970-01-05"; d < date; d = addDays(d, 1)) {
      const weekday = ((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
      if (days.includes(weekday)) count++;
    }
    return count;
  };

  it("is zero on the reference Monday", () => {
    expect(workedDaysBefore([1, 2, 3, 4, 5, 6, 7], "1970-01-05")).toBe(0);
  });

  it("counts the worked days strictly before the date", () => {
    expect(workedDaysBefore([1], "1970-01-06")).toBe(1);
    expect(workedDaysBefore([2], "1970-01-06")).toBe(0);
    expect(workedDaysBefore([1, 3], "1970-01-12")).toBe(2);
  });

  it("matches a day-by-day count", () => {
    for (const days of [[1, 2, 3, 4, 5, 6, 7], [1, 3], [1, 2], [7], [2, 4, 6]]) {
      for (const date of ["1970-01-05", "1970-01-11", "1971-03-17", "2026-10-13", "2026-10-19", "2026-10-25"]) {
        expect(workedDaysBefore(days, date)).toBe(naive(days, date));
      }
    }
  });
});

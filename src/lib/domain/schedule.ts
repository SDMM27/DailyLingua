import type { DateKey } from "@/lib/schemas/common";
import { diffInDays, isoWeekday } from "./dates";

/** ISO weekdays: 1 = Monday … 7 = Sunday. */
export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** A Monday: the fixed origin from which the days worked on a language are counted. */
const REFERENCE_DAY: DateKey = "1970-01-05";

interface Scheduled {
  days: readonly number[];
}

/** The goals worked on `date`, in their own order. A day can have none (rest day). */
export function goalsForDate<T extends Scheduled>(goals: readonly T[], date: DateKey): T[] {
  const weekday = isoWeekday(date);
  return goals.filter((g) => g.days.includes(weekday));
}

/** Minutes planned on a weekday: the sum of the `weight` (minutes) of the goals worked that day. */
export function minutesOnWeekday(goals: readonly (Scheduled & { weight: number })[], weekday: number): number {
  return goals.filter((g) => g.days.includes(weekday)).reduce((sum, g) => sum + g.weight, 0);
}

/** Total of the busiest weekday (0 when there is no goal). */
export function busiestDayMinutes(goals: readonly (Scheduled & { weight: number })[]): number {
  return Math.max(0, ...ALL_WEEKDAYS.map((weekday) => minutesOnWeekday(goals, weekday)));
}

/**
 * Number of days worked on a language before `date`, counted from a fixed Monday: the dates `d`
 * with REFERENCE ≤ d < `date` whose weekday is in `days`. Constant time (whole weeks, then the rest).
 */
export function workedDaysBefore(days: readonly number[], date: DateKey): number {
  const set = new Set(days);
  const elapsed = diffInDays(REFERENCE_DAY, date);
  const weeks = Math.floor(elapsed / 7);
  let count = weeks * set.size;
  // The remaining days start on a Monday (weekday 1), so day i of the remainder has weekday i + 1.
  for (let i = 0; i < elapsed - weeks * 7; i++) if (set.has(i + 1)) count++;
  return count;
}

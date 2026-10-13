import type { DateKey } from "@/lib/schemas/common";
import { addDays } from "./dates";

/**
 * Consecutive study days ending today — or ending yesterday if today's
 * session hasn't happened yet, so the streak isn't shown as broken at 7 am.
 */
export function computeStreak(studyDates: readonly DateKey[], today: DateKey): number {
  const studied = new Set(studyDates);
  let cursor = studied.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (studied.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface DayCell {
  date: DateKey;
  studied: boolean;
  isToday: boolean;
}

/** The last `days` days, oldest first, ending today. */
export function recentDays(studyDates: readonly DateKey[], today: DateKey, days = 7): DayCell[] {
  const studied = new Set(studyDates);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return { date, studied: studied.has(date), isToday: date === today };
  });
}

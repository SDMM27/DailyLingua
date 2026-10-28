import type { DateKey } from "@/lib/schemas/common";
import { addDays, isoWeekday } from "./dates";

/** Longest run of rest days walked over: bounded so a bad input can never loop forever. */
const MAX_REST_RUN = 7;

/**
 * Consecutive study days ending today — or ending yesterday if today's
 * session hasn't happened yet, so the streak isn't shown as broken at 7 am.
 *
 * `studyWeekdays` (ISO weekdays on which the learner works, default every day) lets rest days
 * through: walking back, a day that was not studied and whose weekday is not in the set neither
 * counts nor breaks the streak; a studied day always counts. The *current* weekdays are applied to
 * past dates too, so changing the days can change the streak shown (accepted, to stay simple).
 */
export function computeStreak(
  studyDates: readonly DateKey[],
  today: DateKey,
  studyWeekdays?: ReadonlySet<number>,
): number {
  const studied = new Set(studyDates);
  // An empty set would skip every day: treat it as "every day".
  const worked = studyWeekdays && studyWeekdays.size > 0 ? studyWeekdays : null;
  const isRest = (day: DateKey) => worked !== null && !studied.has(day) && !worked.has(isoWeekday(day));
  let cursor = studied.has(today) ? today : addDays(today, -1);
  let streak = 0;
  // Skipped rest days are not counted, but at most 6 can follow each other (weekdays are 7).
  for (let rest = 0; rest <= MAX_REST_RUN; ) {
    if (studied.has(cursor)) {
      streak += 1;
      rest = 0;
    } else if (isRest(cursor)) {
      rest += 1;
    } else {
      break;
    }
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

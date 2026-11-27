import type { DateKey } from "@dailylingua/schemas";
import { addDays } from "../dates";

/**
 * XP of declared immersion (`j7-social.md` §1.1). A day can be edited while it is at most `IMMERSION_EDITABLE_DAYS`
 * old (the 72 h window of the ingestion) and is closed from the next day on; its XP is written once, at the closing.
 */
export const IMMERSION_EDITABLE_DAYS = 3;
export const IMMERSION_MAX_DAY_XP = 6;
export const IMMERSION_MINUTES_PER_XP = 10;

/** 1 XP per 10 declared minutes (all languages of the day), 6 at most. */
export function immersionDayXp(minutes: number): number {
  return Math.min(IMMERSION_MAX_DAY_XP, Math.floor(Math.max(0, minutes) / IMMERSION_MINUTES_PER_XP));
}

/** Oldest day that can still be declared or changed on learning day `today`. */
export function oldestEditableImmersionDay(today: DateKey): DateKey {
  return addDays(today, -IMMERSION_EDITABLE_DAYS);
}

/** Whether `day` is closed on learning day `today` (no creation, change or deletion). */
export function isImmersionDayClosed(day: DateKey, today: DateKey): boolean {
  return day < oldestEditableImmersionDay(today);
}

/** The `p_through` of `close_immersion_days` on learning day `today`: the newest closed day. */
export function immersionCloseThrough(today: DateKey): DateKey {
  return addDays(today, -(IMMERSION_EDITABLE_DAYS + 1));
}

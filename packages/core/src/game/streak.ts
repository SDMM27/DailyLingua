import type { DateKey } from "@dailylingua/schemas";
import { addDays, diffInDays, isoWeekday } from "../dates";
import type { SettingsHistory } from "./settings";

/** Raw status of a learning day, before freezes and repairs: worked and validated, neutral because of a trip, or nothing. */
export type DayStatus = "validated" | "travel" | "none";

/** Status of each day from the rows of `learning_day` (`validated`, cause `travel`); a day without row is `none`. */
export function dayStatuses(rows: readonly { day: DateKey; validated: boolean; cause: string }[]): (day: DateKey) => DayStatus {
  const map = new Map<DateKey, DayStatus>();
  for (const row of rows) {
    const status: DayStatus = row.validated ? "validated" : row.cause === "travel" ? "travel" : "none";
    // A validated day wins over any other row of the same day.
    if (map.get(row.day) !== "validated") map.set(row.day, status);
  }
  return (day) => map.get(day) ?? "none";
}

/** Facts the streak emits once per day and event (`j2-jeu-xp-serie.md` §4.3, idempotent: the recompute is a pure function of the journal). */
export type StreakEvent =
  | { kind: "freeze_granted"; day: DateKey; source: "gift" | "earned" }
  | { kind: "freeze_used"; day: DateKey }
  | { kind: "streak_repaired"; day: DateKey }
  | { kind: "streak_reset"; day: DateKey; length: number };

export interface StreakInput {
  status: (day: DateKey) => DayStatus;
  history: SettingsHistory;
  /** Days on which a complete `catch_up` session was done. */
  catchUps: readonly DateKey[];
  /** Whether the weekly goal of the week that starts on this Monday was met. */
  weekGoalMet: (monday: DateKey) => boolean;
  /** First day of the account's history. */
  firstDay: DateKey;
  today: DateKey;
}

export interface StreakResult {
  /** Consecutive days validated (daily mode counter; also the days counter in weekly mode). */
  current: number;
  best: number;
  /** Day on which `best` was last raised. */
  bestSetOn: DateKey | null;
  freezes: number;
  lastRepairDay: DateKey | null;
  /** Consecutive weeks validated, the current one included once its target is reached. */
  currentWeeks: number;
  bestWeeks: number;
  /** Last validated day on or before `today`. */
  lastDay: DateKey | null;
  /** Last Monday whose freezes were handed out. */
  freezesGrantedThrough: DateKey | null;
  events: StreakEvent[];
}

export const STARTING_FREEZES = 1;
export const MAX_FREEZES = 3;
/** The gift freeze of Monday is given while the stock is below this. */
export const GIFT_FREEZE_BELOW = 2;
/** Days between two repairs. */
export const REPAIR_INTERVAL_DAYS = 30;
/** A missed day stays repairable for this many days after it. */
export const REPAIR_WINDOW_DAYS = 2;

/** Monday of the week of `day`. */
const mondayOf = (day: DateKey): DateKey => addDays(day, -(isoWeekday(day) - 1));

/**
 * Recomputes the streak from the journal of days (`j2-jeu-xp-serie.md` §4.2). Pure and deterministic: the same journal,
 * the same history of settings and the same `today` give the same state, whatever the order the batches arrived in,
 * and replaying it twice changes nothing. No clock is read.
 *
 * Differences from the pseudo-code of the spec, all on weekly mode: the days counter is reset when a week closes
 * short of its target (instead of on each missed day of that week), and the best number of weeks is tracked.
 */
export function recomputeStreak(input: StreakInput): StreakResult {
  const { status, history, weekGoalMet, firstDay, today } = input;
  // Sorted: with two catch-up sessions in reach, the earliest repairs, whatever the order they were handed in.
  const catchUps = [...input.catchUps].sort();
  const events: StreakEvent[] = [];
  let freezes = STARTING_FREEZES;
  let current = 0;
  let best = 0;
  let bestSetOn: DateKey | null = null;
  let lastRepairDay: DateKey | null = null;
  let weeks = 0;
  let bestWeeks = 0;
  let lastDay: DateKey | null = null;
  let grantedThrough: DateKey | null = null;

  const validatedInWeek = (monday: DateKey): number => {
    let count = 0;
    for (let i = 0; i < 7; i++) if (status(addDays(monday, i)) === "validated") count++;
    return count;
  };
  const weekValid = (monday: DateKey): boolean => validatedInWeek(monday) >= history.weeklyTargetAt(monday);
  const raise = (day: DateKey): void => {
    current++;
    if (current > best) {
      best = current;
      bestSetOn = day;
    }
  };
  /** Days strictly between a missed day and its repair are covered: worked, neutral, rest or series off. */
  const coveredBetween = (from: DateKey, to: DateKey): boolean => {
    for (let day = addDays(from, 1); day < to; day = addDays(day, 1)) {
      if (!history.enabledAt(day) || status(day) !== "none" || history.isRestDay(day)) continue;
      return false;
    }
    return true;
  };

  for (let day = firstDay; day <= today; day = addDays(day, 1)) {
    if (isoWeekday(day) === 1 && day !== firstDay) {
      // Monday: close the week that ended, then hand out the freezes.
      const closed = addDays(day, -7);
      if (history.enabledAt(closed)) {
        weeks = weekValid(closed) ? weeks + 1 : 0;
        bestWeeks = Math.max(bestWeeks, weeks);
        if (history.modeAt(closed) === "weekly" && !weekValid(closed)) current = 0;
      }
      if (history.enabledAt(day)) {
        if (weekGoalMet(closed) && freezes < MAX_FREEZES) {
          freezes++;
          events.push({ kind: "freeze_granted", day, source: "earned" });
        }
        if (freezes < GIFT_FREEZE_BELOW) {
          freezes++;
          events.push({ kind: "freeze_granted", day, source: "gift" });
        }
      }
      grantedThrough = day;
    }
    if (!history.enabledAt(day)) continue; // series off: neutral day

    const raw = status(day);
    if (raw === "validated") {
      raise(day);
      lastDay = day;
      continue;
    }
    if (day === today) continue; // the current day is never missed
    if (raw === "travel" || history.isRestDay(day)) continue;
    if (history.modeAt(day) === "weekly") continue; // no freeze, no repair: the week decides
    if (current === 0) continue;
    if (freezes > 0) {
      freezes--;
      events.push({ kind: "freeze_used", day });
      continue;
    }
    const repair = catchUps.find((catchUp) => catchUp === addDays(day, 1) || catchUp === addDays(day, REPAIR_WINDOW_DAYS));
    if (
      repair !== undefined &&
      status(repair) === "validated" &&
      coveredBetween(day, repair) &&
      (lastRepairDay === null || diffInDays(lastRepairDay, repair) >= REPAIR_INTERVAL_DAYS)
    ) {
      lastRepairDay = repair;
      raise(day);
      events.push({ kind: "streak_repaired", day });
      continue;
    }
    if (day < addDays(today, -REPAIR_WINDOW_DAYS)) {
      events.push({ kind: "streak_reset", day, length: current });
      current = 0;
    } // otherwise still repairable: the streak waits
  }

  const currentWeeks = weeks + (history.enabledAt(today) && weekValid(mondayOf(today)) ? 1 : 0);
  return {
    current,
    best,
    bestSetOn,
    freezes,
    lastRepairDay,
    currentWeeks,
    bestWeeks: Math.max(bestWeeks, currentWeeks),
    lastDay,
    freezesGrantedThrough: grantedThrough,
    events,
  };
}

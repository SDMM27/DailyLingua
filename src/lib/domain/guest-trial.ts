import type { DateKey } from "@/lib/schemas/common";

/** A guest (account without e-mail) can have a mission on this many distinct days. */
export const GUEST_TRIAL_DAYS = 3;

export interface GuestTrialStatus {
  /** Distinct days with a mission, today included. */
  daysUsed: number;
  daysLeft: number;
  /** Whether today's mission may be prepared: it already exists, or a trial day is still free. */
  canStartToday: boolean;
}

/**
 * Where a guest stands in the trial. `missionDates` are the days they got a mission (duplicates
 * and days after `today` are ignored). Today's mission, once there, always stays reachable.
 */
export function guestTrialStatus(missionDates: DateKey[], today: DateKey): GuestTrialStatus {
  const days = new Set(missionDates.filter((date) => date <= today));
  const daysUsed = days.size;
  const before = days.has(today) ? daysUsed - 1 : daysUsed;
  return {
    daysUsed,
    daysLeft: Math.max(GUEST_TRIAL_DAYS - daysUsed, 0),
    canStartToday: days.has(today) || before < GUEST_TRIAL_DAYS,
  };
}

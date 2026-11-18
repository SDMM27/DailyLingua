import type { XpRuleId, XpZeroReason } from "@dailylingua/schemas";

/**
 * Daily ceilings and yields of the `j2.1` scale (`j2-jeu-xp-serie.md` §1). All ceilings are per user, every
 * language together, per learning day (the day of the action, also for a late event).
 */
export const DAILY_CAPS = {
  /** `review.*` together, bonuses included. */
  review: 120,
  /** Successes counted per day at full rate, then one in two up to `REVIEW_SUCCESS_CEILING`, then none. */
  reviewFullRateSuccesses: 150,
  reviewSuccessCeiling: 300,
  /** `reading.*` together. */
  input: 100,
  /** Texts paid in full per day; the next ones pay half (rounded down). */
  inputFullRateTexts: 4,
  focusPerSession: 20,
  focusPerDay: 40,
  productions: 2,
  rewriteXp: 20,
  rewritesPerProduction: 2,
  errorOfDay: 2,
  fluencyPasses: 2,
  sessionComplete: 1,
} as const;

/** Theoretical maximum of a day with every cap reached: 120 + 100 + 40 + 30 + 20 + 6 + 10 + 10. */
export const THEORETICAL_DAILY_MAX = 336;
/** Safety bound of `ingest_batch` in SQL (`app.xp_ledger` sum of a day). */
export const SQL_DAILY_XP_BOUND = 400;

export interface Granted {
  amount: number;
  /** Why the amount is 0 although the answer was right, or null. */
  zero: XpZeroReason | null;
  /** The amount was reduced by a yield rule (halved text, one success in two). */
  diminished: boolean;
}

const none = (zero: XpZeroReason): Granted => ({ amount: 0, zero, diminished: false });

/** Whether `reason` belongs to the revisions ceiling (all `review.*` rules). */
export const isReviewRule = (reason: string): boolean => reason.startsWith("review.");
export const isReadingRule = (reason: string): boolean => reason.startsWith("reading.");
export const isFocusRule = (reason: string): boolean => reason.startsWith("focus.");
export const isRewriteRule = (reason: string): boolean => reason.startsWith("rewrite.");

/** The part of `amount` that fits under `ceiling` once `used` is spent; 0 with `cap_reached` when nothing fits. */
function underCeiling(amount: number, used: number, ceiling: number): Granted {
  const room = Math.max(0, ceiling - used);
  if (room <= 0) return none("cap_reached");
  return { amount: Math.min(amount, room), zero: null, diminished: false };
}

/**
 * A counted review success, or a bonus: yield by the day's success index (the 151st to the 300th pay one in
 * two, starting with the 151st; beyond the 300th nothing) then the 120 XP ceiling. `successIndex` is the 1-based
 * rank of this success among the counted successes of the day (a bonus passes the rank of its success).
 */
export function capReview(amount: number, params: { successIndex: number; xpToday: number }): Granted {
  const { successIndex, xpToday } = params;
  const { reviewFullRateSuccesses: full, reviewSuccessCeiling: ceiling } = DAILY_CAPS;
  if (successIndex > ceiling) return none("diminishing");
  if (successIndex > full && (successIndex - full) % 2 === 0) return none("diminishing");
  const granted = underCeiling(amount, xpToday, DAILY_CAPS.review);
  return successIndex > full ? { ...granted, diminished: true } : granted;
}

/** A reading: the 5th text of the day and the next ones pay half (rounded down), then the 100 XP ceiling. */
export function capReading(amount: number, params: { textsToday: number; xpToday: number }): Granted {
  const diminished = params.textsToday >= DAILY_CAPS.inputFullRateTexts;
  const value = diminished ? Math.floor(amount * 0.5) : amount;
  const granted = underCeiling(value, params.xpToday, DAILY_CAPS.input);
  return { ...granted, diminished: diminished && granted.amount > 0 };
}

/** A workshop item: 20 XP a session and 40 XP a day. */
export function capFocus(amount: number, params: { xpSession: number; xpDay: number }): Granted {
  const room = Math.min(DAILY_CAPS.focusPerSession - params.xpSession, DAILY_CAPS.focusPerDay - params.xpDay);
  return room <= 0 ? none("cap_reached") : { amount: Math.min(amount, room), zero: null, diminished: false };
}

/** A rewarded rewrite: 2 sentences per production and 20 XP a day. */
export function capRewrite(amount: number, params: { rewardedForProduction: number; xpDay: number }): Granted {
  if (params.rewardedForProduction >= DAILY_CAPS.rewritesPerProduction) return none("cap_reached");
  return underCeiling(amount, params.xpDay, DAILY_CAPS.rewriteXp);
}

/** A rule capped by a number of rewards a day (productions 2, error of the day 2, fluency 2, session 1). */
export function capCount(amount: number, params: { rewardsToday: number; max: number }): Granted {
  return params.rewardsToday >= params.max ? none("cap_reached") : { amount, zero: null, diminished: false };
}

/** Ceiling, in rewards a day, of the rules capped by count. */
export const COUNT_CAPS: Partial<Record<XpRuleId, number>> = {
  "production.corrected": DAILY_CAPS.productions,
  "error_of_day.reworked": DAILY_CAPS.errorOfDay,
  "fluency.pass": DAILY_CAPS.fluencyPasses,
  "session.complete": DAILY_CAPS.sessionComplete,
};

import { ringTiers, type DateKey, type RingTier } from "@dailylingua/schemas";
import { addDays, isoWeekday } from "../dates";

/** XP of the day's goal per tier (`j2-jeu-xp-serie.md` §5). The 45 minute tier (220 XP) opens in milestone 3. */
export const RING_TIER_XP: Record<RingTier, number> = { 10: 50, 15: 75, 20: 100, 30: 150 };

/** Days of a week that count towards the weekly goal: 5 times the daily goal. */
export const WEEK_GOAL_DAYS = 5;

export function ringGoalXp(tier: RingTier): number {
  return RING_TIER_XP[tier];
}

export interface RingFill {
  xp: number;
  goal: number;
  /** 0 to 1: the ring never goes past full, there is no bonus beyond 100 %. */
  ratio: number;
  /** Whole percent, capped at 100 (what is shown when the XP is hidden). */
  percent: number;
  complete: boolean;
}

/** Fill of the ring for `xp` (the day's `ringXp`) at `tier`. */
export function ringFill(xp: number, tier: RingTier): RingFill {
  const goal = ringGoalXp(tier);
  const ratio = Math.min(1, Math.max(0, xp / goal));
  return { xp, goal, ratio, percent: Math.floor(ratio * 100), complete: xp >= goal };
}

/** Monday of the week a learning day belongs to (a week runs Monday 04:00 to the next Monday 03:59). */
export function weekStart(day: DateKey): DateKey {
  return addDays(day, -(isoWeekday(day) - 1));
}

/** The seven learning days of a week from its Monday. */
export function weekDays(monday: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Weekly goal: 5 times the goal of the tier in force on Monday, frozen for the week. */
export function weeklyGoalXp(tier: RingTier): number {
  return WEEK_GOAL_DAYS * ringGoalXp(tier);
}

export interface WeekProgress {
  xp: number;
  goal: number;
  met: boolean;
  /** Days of the week with something to show: ring complete, for the seven dots. */
  ringCompleteDays: DateKey[];
}

/**
 * Progress of a week: the XP of its days (`ringXp` of each, late lines out) against the goal of the tier in force
 * on Monday. With the ring switched off on that Monday the goal is never met (no freeze is earned).
 */
export function weekProgress(params: {
  monday: DateKey;
  tier: RingTier;
  ringEnabled: boolean;
  xpByDay: (day: DateKey) => number;
}): WeekProgress {
  const days = weekDays(params.monday);
  const xp = days.reduce((total, day) => total + params.xpByDay(day), 0);
  const goal = weeklyGoalXp(params.tier);
  return {
    xp,
    goal,
    met: params.ringEnabled && xp >= goal,
    ringCompleteDays: days.filter((day) => params.xpByDay(day) >= ringGoalXp(params.tier)),
  };
}

export interface LowerGoalInput {
  /** The last 14 closed learning days with their `ringXp`, the tier in force and whether the day was a rest day. */
  days: readonly { day: DateKey; xp: number; tier: RingTier; rest: boolean }[];
  /** The proposal was already made once on this account. */
  alreadyProposed: boolean;
}

export type LowerGoalProposal = { propose: false } | { propose: true; toTier: RingTier; typicalXp: number };

/**
 * "Lower the goal" (`j2-jeu-xp-serie.md` §5): offered once per account when, over 14 closed days at the same tier,
 * no ring was completed and at least 4 days had some XP (otherwise the absence is a matter of resuming, not of the
 * goal). The proposal is the tier just below; none at the 10 minute tier. `typicalXp` is the median XP of the days
 * with some, for the sentence "your days revolve around 40 XP".
 */
export function lowerGoalProposal(input: LowerGoalInput): LowerGoalProposal {
  const { alreadyProposed } = input;
  if (alreadyProposed || input.days.length < 14) return { propose: false };
  const days = input.days.filter((entry) => !entry.rest);
  if (days.length === 0) return { propose: false };
  const tier = (days[0] as { tier: RingTier }).tier;
  if (days.some((entry) => entry.tier !== tier)) return { propose: false };
  if (days.some((entry) => entry.xp >= ringGoalXp(tier))) return { propose: false };
  const active = days.filter((entry) => entry.xp > 0).map((entry) => entry.xp);
  if (active.length < 4) return { propose: false };
  const index = ringTiers.indexOf(tier);
  const toTier = ringTiers[index - 1];
  if (toTier === undefined) return { propose: false };
  const sorted = [...active].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? (sorted[middle] as number) : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
  return { propose: true, toTier, typicalXp: Math.round(median) };
}

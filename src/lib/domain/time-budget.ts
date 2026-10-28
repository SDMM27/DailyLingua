import type { Language } from "@/lib/schemas/common";
import type { LanguageSession, Mission } from "@/lib/schemas/mission";

export interface BudgetShare {
  language: Language;
  minutes: number;
}

/** Minutes a language gets per day: below this, a session (content + production) makes no sense. */
export const MIN_LANGUAGE_MINUTES = 10;
/** Most the learner can plan in one day, all languages together. */
export const MAX_DAILY_MINUTES = 120;
export const MINUTES_STEP = 5;

/** Total minutes per day: the goals' `weight` is the minutes of each language. */
export function totalMinutes(goals: readonly { weight: number }[]): number {
  return goals.reduce((sum, g) => sum + g.weight, 0);
}

/** Subtracts 5 from the largest share above the minimum (first one on a tie) until the sum fits in a day. */
function trimToDay(shares: BudgetShare[]): BudgetShare[] {
  const result = shares.map((s) => ({ ...s }));
  while (result.reduce((sum, s) => sum + s.minutes, 0) > MAX_DAILY_MINUTES) {
    let largest = -1;
    for (let i = 0; i < result.length; i++) {
      if (result[i].minutes > MIN_LANGUAGE_MINUTES && (largest < 0 || result[i].minutes > result[largest].minutes)) {
        largest = i;
      }
    }
    if (largest < 0) break;
    result[largest].minutes -= MINUTES_STEP;
  }
  return result;
}

function roundShare(minutes: number): number {
  return Math.max(MIN_LANGUAGE_MINUTES, Math.round(minutes / MINUTES_STEP) * MINUTES_STEP);
}

/**
 * Converts the old relative weights into minutes per language: each share of `dailyMinutes` is
 * rounded to 5 minutes, at least 10, then trimmed to 120 in total. For data saved before weights
 * became minutes (the SQL migration does the same) and for the demo.
 */
export function weightsToMinutes(
  dailyMinutes: number,
  goals: readonly { language: Language; weight: number }[],
): BudgetShare[] {
  const weightSum = goals.reduce((sum, g) => sum + g.weight, 0);
  return trimToDay(
    goals.map((g) => ({ language: g.language, minutes: roundShare((dailyMinutes * g.weight) / weightSum) })),
  );
}

export type MinutesPreset = "balanced" | "focus-first";

/**
 * Presets of the preferences screen: "balanced" splits `total` equally, "focus-first" gives about
 * two thirds to the first language and splits the rest equally. Shares are multiples of 5, at least 10.
 */
export function presetMinutes(total: number, languages: readonly Language[], preset: MinutesPreset): BudgetShare[] {
  if (languages.length === 0) return [];
  const count = languages.length;
  const firstShare = preset === "focus-first" && count > 1 ? (total * 2) / 3 : total / count;
  const otherShare = count > 1 ? (total - firstShare) / (count - 1) : 0;
  return trimToDay(
    languages.map((language, i) => ({ language, minutes: roundShare(i === 0 ? firstShare : otherShare) })),
  );
}

/**
 * Splits the daily budget across languages in proportion to their weights.
 * Uses the largest-remainder method so the minutes always add up to the total.
 */
export function splitBudget(
  totalMinutes: number,
  weights: readonly { language: Language; weight: number }[],
): BudgetShare[] {
  if (!Number.isInteger(totalMinutes) || totalMinutes <= 0) {
    throw new RangeError("totalMinutes must be a positive integer");
  }
  if (weights.length === 0) throw new RangeError("at least one language is required");
  if (weights.some((w) => w.weight <= 0)) throw new RangeError("weights must be positive");

  const weightSum = weights.reduce((sum, w) => sum + w.weight, 0);
  const exact = weights.map((w) => (totalMinutes * w.weight) / weightSum);
  const minutes = exact.map(Math.floor);
  let leftover = totalMinutes - minutes.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((value, i) => ({ i, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (const { i } of byRemainder) {
    if (leftover === 0) break;
    minutes[i] += 1;
    leftover -= 1;
  }
  return weights.map((w, i) => ({ language: w.language, minutes: minutes[i] }));
}

export function sessionMinutes(session: LanguageSession): number {
  return session.activities.reduce((sum, a) => sum + a.estimatedMinutes, 0);
}

export function missionMinutes(mission: Mission): number {
  return mission.sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
}

export interface BudgetCheck {
  plannedMinutes: number;
  budgetMinutes: number;
  withinBudget: boolean;
  overByMinutes: number;
}

export function checkBudget(mission: Mission): BudgetCheck {
  const plannedMinutes = missionMinutes(mission);
  const overByMinutes = Math.max(0, plannedMinutes - mission.budgetMinutes);
  return {
    plannedMinutes,
    budgetMinutes: mission.budgetMinutes,
    withinBudget: overByMinutes === 0,
    overByMinutes,
  };
}

export function completedMinutes(mission: Mission, completedActivityIds: ReadonlySet<string>): number {
  return mission.sessions
    .flatMap((s) => s.activities)
    .filter((a) => completedActivityIds.has(a.id))
    .reduce((sum, a) => sum + a.estimatedMinutes, 0);
}

/** Progress in [0, 1], based on the time of completed activities. */
export function missionProgress(mission: Mission, completedActivityIds: ReadonlySet<string>): number {
  const total = missionMinutes(mission);
  if (total === 0) return 0;
  return Math.min(1, completedMinutes(mission, completedActivityIds) / total);
}

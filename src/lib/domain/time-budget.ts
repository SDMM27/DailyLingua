import type { Language } from "@/lib/schemas/common";
import type { LanguageSession, Mission } from "@/lib/schemas/mission";

export interface BudgetShare {
  language: Language;
  minutes: number;
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

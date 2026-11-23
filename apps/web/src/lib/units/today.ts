import { valueToLevel } from "@dailylingua/core";
import type { Unit } from "@dailylingua/schemas";
import { loadUnitProgress, type UnitProgressView } from "./progress";
import { visibleUnitsFor } from "./visibility";

/** Whether the mean of the skill estimates of a language is A0 or A1 (no estimate: not a beginner we can tell). */
export function isBeginner(estimates: readonly { levelValue: number }[]): boolean {
  if (estimates.length === 0) return false;
  const mean = estimates.reduce((sum, estimate) => sum + estimate.levelValue, 0) / estimates.length;
  const level = valueToLevel(mean);
  return level === "A0" || level === "A1";
}

/** The first visible situation unit the learner has not passed, with its progress; null when there is none. */
export async function nextUnitToDo(userId: string, language: string): Promise<{ unit: Unit; progress: UnitProgressView | null } | null> {
  for (const unit of visibleUnitsFor(language)) {
    if (unit.kind !== "situation") continue;
    const progress = await loadUnitProgress(userId, unit.id);
    if (progress?.passedAt == null) return { unit, progress };
  }
  return null;
}

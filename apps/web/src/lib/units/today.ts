import type { Unit } from "@dailylingua/schemas";
import { loadUnitProgress, type UnitProgressView } from "./progress";
import { visibleUnitsFor } from "./visibility";

/** The first visible unit the learner has not passed, in path order, with its progress; null when there is none. */
export async function nextUnitToDo(userId: string, language: string): Promise<{ unit: Unit; progress: UnitProgressView | null } | null> {
  for (const unit of visibleUnitsFor(language)) {
    const progress = await loadUnitProgress(userId, unit.id);
    if (progress?.passedAt == null) return { unit, progress };
  }
  return null;
}

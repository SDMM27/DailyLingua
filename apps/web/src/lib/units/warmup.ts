import { getPendingWarmups } from "@dailylingua/data";
import type { Unit } from "@dailylingua/schemas";
import { getRequestClient } from "@/lib/session";
import { lessonOfItem } from "./flow";
import { warmupDue } from "./path";
import { visibleUnit } from "./visibility";

/** A unit with the missed sentences of its last failed test the learner can redo today. */
export interface DueWarmup {
  unit: Unit;
  itemIds: string[];
}

/**
 * The warm-ups to offer now (`j4-pr2.md` §3): from the learning day after the failed test (the learner's time zone),
 * for the visible units still not passed. Items the unit no longer has (it changed since) are left out; nothing is
 * left to do for a unit with no item left.
 */
export async function loadDueWarmups(userId: string, language: string, timeZone: string, now = new Date()): Promise<DueWarmup[]> {
  const pending = await getPendingWarmups(await getRequestClient(), userId, language);
  return pending.flatMap(({ unitId, testedAt, itemIds }) => {
    const unit = visibleUnit(unitId);
    // A bilan has no warm-up: its items belong to no step, the server would refuse their attempts.
    if (!unit || unit.kind === "assessment" || !warmupDue(testedAt, now, timeZone)) return [];
    const known = itemIds.filter((id) => unit.items.some((item) => item.id === id) && lessonOfItem(unit, id) !== undefined);
    return known.length > 0 ? [{ unit, itemIds: known }] : [];
  });
}

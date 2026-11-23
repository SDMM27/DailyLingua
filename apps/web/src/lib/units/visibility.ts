import { getUnit, isPublished, unitsFor } from "@dailylingua/content";
import type { Unit } from "@dailylingua/schemas";
import { unitDraftsAllowed } from "@/lib/ingest/ingest-events";

/**
 * Whether a unit may be shown: published, or any status when drafts are allowed (`UNIT_DRAFTS=show` outside production,
 * the same gate as the server's ingestion). Read at request time.
 */
export function unitVisible(unit: Pick<Unit, "status">): boolean {
  return isPublished(unit) || unitDraftsAllowed();
}

/** The visible unit with this id, or undefined. */
export function visibleUnit(id: string): Unit | undefined {
  const unit = getUnit(id);
  return unit && unitVisible(unit) ? unit : undefined;
}

/** The visible units of a language, in path order. */
export function visibleUnitsFor(language: string): Unit[] {
  return unitsFor(language).filter(unitVisible);
}

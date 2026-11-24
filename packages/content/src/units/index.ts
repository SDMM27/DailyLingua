import type { Unit, UnitId } from "@dailylingua/schemas";
import { IT_UNITS } from "./it";
import { RU_UNITS } from "./ru";
import { buildRegistry, unitsIn } from "./registry";

export { buildRegistry, isPublished, unitVersion } from "./registry";

export const UNITS: Record<UnitId, Unit> = buildRegistry([...IT_UNITS, ...RU_UNITS]);

export function getUnit(id: string): Unit | undefined {
  return Object.hasOwn(UNITS, id) ? UNITS[id] : undefined;
}

/** The units of a language, sorted by `order`. */
export function unitsFor(language: string): Unit[] {
  return unitsIn(UNITS, language);
}

import type { Unit, UnitId } from "@dailylingua/schemas";
import { itA101Saluer } from "./it/01-saluer";
import { ruA101Saluer } from "./ru/01-saluer";
import { buildRegistry, unitsIn } from "./registry";

export { buildRegistry, isPublished, unitVersion } from "./registry";

export const UNITS: Record<UnitId, Unit> = buildRegistry([itA101Saluer, ruA101Saluer]);

export function getUnit(id: string): Unit | undefined {
  return Object.hasOwn(UNITS, id) ? UNITS[id] : undefined;
}

/** The units of a language, sorted by `order`. */
export function unitsFor(language: string): Unit[] {
  return unitsIn(UNITS, language);
}

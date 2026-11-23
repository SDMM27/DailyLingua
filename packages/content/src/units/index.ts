import type { Unit, UnitId } from "@dailylingua/schemas";
import { itA101Saluer } from "./it/01-saluer";
import { ruA101Saluer } from "./ru/01-saluer";
import { ruA0E1LettresFamilieres } from "./ru/e1-lettres-familieres";
import { ruA0E2FauxAmis } from "./ru/e2-faux-amis";
import { ruA0E3FormesNouvelles } from "./ru/e3-formes-nouvelles";
import { ruA0E4Chuintantes } from "./ru/e4-chuintantes";
import { ruA0E5VoyellesSignes } from "./ru/e5-voyelles-signes";
import { buildRegistry, unitsIn } from "./registry";

export { buildRegistry, isPublished, unitVersion } from "./registry";

export const UNITS: Record<UnitId, Unit> = buildRegistry([
  itA101Saluer,
  ruA0E1LettresFamilieres,
  ruA0E2FauxAmis,
  ruA0E3FormesNouvelles,
  ruA0E4Chuintantes,
  ruA0E5VoyellesSignes,
  ruA101Saluer,
]);

export function getUnit(id: string): Unit | undefined {
  return Object.hasOwn(UNITS, id) ? UNITS[id] : undefined;
}

/** The units of a language, sorted by `order`. */
export function unitsFor(language: string): Unit[] {
  return unitsIn(UNITS, language);
}

import { stableStringify } from "@dailylingua/core";
import {
  isAssessmentUnit,
  unitSchema,
  type ParsedUnitSource,
  type ResolvedAssessmentSource,
  type Unit,
  type UnitId,
  type UnitItem,
  type UnitSource,
} from "@dailylingua/schemas";
import { sha256Hex } from "../sha256";

/** Version of a unit: the first 12 hex characters of the SHA-256 of its canonical JSON (keys sorted). */
export function unitVersion(source: Exclude<UnitSource, { kind: "assessment" }>): string {
  return sha256Hex(stableStringify(source)).slice(0, 12);
}

/** Two-digit number of a unit, from its id (`it-a1-08-gouts` gives `08`). */
export function unitNumber(unitId: string): string {
  return unitId.split("-")[2] ?? "";
}

/**
 * Resolves a bilan (`j4-pr3.md` §2.1): the drawn items copied with their ids rewritten `<nn>-<itemId>`, one lesson with
 * the test step, the test of the ten items, and a version that hashes the source and the items, so changing a drawn
 * item changes the version of the bilan. Throws when a drawn unit or item does not exist.
 */
function resolveAssessment(
  raw: unknown,
  source: Extract<ParsedUnitSource, { kind: "assessment" }>,
  others: Readonly<Record<UnitId, Unit>>,
): Unit {
  const items: UnitItem[] = [];
  const drawnFrom: Record<string, UnitId> = {};
  for (const draw of source.draws) {
    const from = Object.hasOwn(others, draw.unit) ? others[draw.unit] : undefined;
    if (!from || isAssessmentUnit(from)) throw new Error(`Invalid unit ${source.id}: draws from the unknown unit ${draw.unit}`);
    const item = from.items.find((entry) => entry.id === draw.item);
    if (!item) throw new Error(`Invalid unit ${source.id}: ${draw.unit} has no item ${draw.item}`);
    const id = `${unitNumber(from.id)}-${item.id}`;
    items.push({ ...structuredClone(item), id });
    drawnFrom[id] = from.id;
  }
  const ids = items.map((item) => item.id);
  const resolved: ResolvedAssessmentSource = {
    ...source,
    items,
    drawnFrom,
    lessons: [{ id: "l1", steps: [{ step: "test", itemIds: [], threshold: 0.8 }] }],
    test: { itemIds: ids, passScore: 8 },
  };
  return { ...resolved, version: sha256Hex(stableStringify({ source: raw, items })).slice(0, 12) };
}

/**
 * Validates each source with `unitSchema` and computes its version; the bilans are resolved after the other units.
 * Pure; throws on an invalid source, a duplicated id or a bilan that draws what does not exist (the message names
 * the unit).
 */
export function buildRegistry(sources: readonly unknown[]): Record<UnitId, Unit> {
  const registry: Record<UnitId, Unit> = {};
  const assessments: { raw: unknown; source: Extract<ParsedUnitSource, { kind: "assessment" }> }[] = [];
  const ids = new Set<string>();
  for (const raw of sources) {
    const parsed = unitSchema.safeParse(raw);
    if (!parsed.success) {
      const id = typeof raw === "object" && raw !== null && "id" in raw ? String(raw.id) : "?";
      throw new Error(`Invalid unit ${id}: ${parsed.error.message}`);
    }
    const source = parsed.data;
    if (ids.has(source.id)) throw new Error(`Duplicate unit id ${source.id}`);
    ids.add(source.id);
    if (isAssessmentUnit(source)) {
      assessments.push({ raw, source });
      continue;
    }
    // The version hashes what the author wrote (not the parsed value), so a new default never changes it.
    registry[source.id] = { ...source, version: unitVersion(raw as Exclude<UnitSource, { kind: "assessment" }>) };
  }
  const resolvable = { ...registry };
  for (const { raw, source } of assessments) registry[source.id] = resolveAssessment(raw, source, resolvable);
  return registry;
}

/** The units of `language` in a registry, in path order. */
export function unitsIn(registry: Readonly<Record<UnitId, Unit>>, language: string): Unit[] {
  return Object.values(registry)
    .filter((unit) => unit.language === language)
    .sort((a, b) => a.order - b.order);
}

/** A unit is published once an AI review is recorded on it. */
export function isPublished(unit: Pick<Unit, "status">): boolean {
  return unit.status === "published";
}

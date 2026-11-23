import { stableStringify } from "@dailylingua/core";
import { unitSchema, type Unit, type UnitId, type UnitSource } from "@dailylingua/schemas";
import { sha256Hex } from "../sha256";

/** Version of a unit: the first 12 hex characters of the SHA-256 of its canonical JSON (keys sorted). */
export function unitVersion(source: UnitSource): string {
  return sha256Hex(stableStringify(source)).slice(0, 12);
}

/**
 * Validates each source with `unitSchema` and computes its version. Pure; throws on an invalid source or a
 * duplicated id (the message names the unit).
 */
export function buildRegistry(sources: readonly unknown[]): Record<UnitId, Unit> {
  const registry: Record<UnitId, Unit> = {};
  for (const raw of sources) {
    const parsed = unitSchema.safeParse(raw);
    if (!parsed.success) {
      const id = typeof raw === "object" && raw !== null && "id" in raw ? String(raw.id) : "?";
      throw new Error(`Invalid unit ${id}: ${parsed.error.message}`);
    }
    const source = parsed.data;
    if (registry[source.id]) throw new Error(`Duplicate unit id ${source.id}`);
    // The version hashes what the author wrote (not the parsed value), so a new default never changes it.
    registry[source.id] = { ...source, version: unitVersion(raw as UnitSource) };
  }
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

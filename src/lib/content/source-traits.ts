import { SOURCE_CATALOG } from "./catalog";
import { traitLabels, type SourceTraits } from "./trait-labels";

export type { SourceTraits } from "./trait-labels";

/**
 * Traits of the catalogue sources (nothing is stored in the database). Server side only: importing
 * this module pulls in the whole catalogue.
 */
const TRAITS = new Map<string, SourceTraits>(
  SOURCE_CATALOG.flatMap((s) =>
    s.instructionLanguage || s.audience
      ? [[s.key, { instructionLanguage: s.instructionLanguage, audience: s.audience }] as const]
      : [],
  ),
);

const NONE: SourceTraits = {};

/** Traits of the catalogue source with this key; none for an unknown key or a plain source. */
export function sourceTraits(key: string | null | undefined): SourceTraits {
  return (key ? TRAITS.get(key) : undefined) ?? NONE;
}

/** Pill labels for the catalogue source with this key (empty for a plain target-language source). */
export function sourceTraitLabels(key: string | null | undefined): string[] {
  return traitLabels(sourceTraits(key));
}

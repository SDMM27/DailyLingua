import type { InstructionLanguage, SourceAudience } from "@/lib/schemas/content";

/** What sets a source apart for a learner. */
export interface SourceTraits {
  /** Language the content explains in when it is not the studied one. */
  instructionLanguage?: InstructionLanguage;
  audience?: SourceAudience;
}

/**
 * Pill labels for a source's traits, in display order (empty for a plain target-language source).
 * Kept apart from the catalogue lookup so client components do not ship the whole catalogue.
 */
export function traitLabels({ instructionLanguage, audience }: SourceTraits): string[] {
  const labels: string[] = [];
  if (instructionLanguage === "fr") labels.push("Expliqué en français");
  if (instructionLanguage === "en") labels.push("Expliqué en anglais");
  if (audience === "children") labels.push("Jeunesse");
  return labels;
}

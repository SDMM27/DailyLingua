import type { CefrLevel, Language } from "@/lib/schemas/common";
import type { AssessmentDossier } from "@/lib/schemas/assessment";
import { readDraftPolicy, type DraftPolicy } from "@/lib/draft-policy";
import { ASSESSMENT_DOSSIERS } from "./dossiers";

export type AssessmentDraftPolicy = DraftPolicy;

/**
 * ASSESSMENT_DRAFTS: "show" or "hide" the dossiers no native speaker has approved or recorded yet.
 * Defaults to "hide" in production (`VERCEL_ENV`), "show" elsewhere. A wrong value fails loudly
 * rather than silently showing drafts.
 */
export function readAssessmentDraftPolicy(source: Record<string, string | undefined> = process.env): AssessmentDraftPolicy {
  return readDraftPolicy("ASSESSMENT_DRAFTS", source);
}

/** Visible when shown as drafts, or reviewed by a native speaker AND recorded. */
export function isDossierVisible(dossier: AssessmentDossier, policy: AssessmentDraftPolicy): boolean {
  return policy === "show" || (dossier.reviewedOn !== null && dossier.audio !== null);
}

/** The dossiers of a language and level the learner may see. */
export function visibleDossiers(language: Language, level: CefrLevel, policy: AssessmentDraftPolicy): AssessmentDossier[] {
  return (ASSESSMENT_DOSSIERS[language] ?? []).filter((d) => d.level === level && isDossierVisible(d, policy));
}

import type { Language } from "@/lib/schemas/common";
import type { AssessmentDossier } from "@/lib/schemas/assessment";
import { itDossiers } from "./it";
import { ruDossiers } from "./ru";

/**
 * Curated dossiers as authored, for the languages that have some. Server side only: a page passes
 * the learner one dossier stripped of its script and reference answers, never this map.
 */
export const ASSESSMENT_DOSSIERS: Partial<Record<Language, AssessmentDossier[]>> = {
  ru: ruDossiers,
  it: itDossiers,
};

/** Languages that have dossiers. */
export function assessmentLanguages(): Language[] {
  return Object.keys(ASSESSMENT_DOSSIERS) as Language[];
}

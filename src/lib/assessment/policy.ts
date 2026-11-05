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

/**
 * Visible when shown as drafts, or reviewed by a native speaker AND its listening is ready: recorded
 * (script source), or its video passage listened to by a human (YouTube source).
 */
export function isDossierVisible(dossier: AssessmentDossier, policy: AssessmentDraftPolicy): boolean {
  if (policy === "show") return true;
  if (dossier.reviewedOn === null) return false;
  return dossier.listening.source === "youtube" ? dossier.listening.video.checkedOn !== null : dossier.audio !== null;
}

/** The dossiers of a language and level the learner may see. */
export function visibleDossiers(language: Language, level: CefrLevel, policy: AssessmentDraftPolicy): AssessmentDossier[] {
  return (ASSESSMENT_DOSSIERS[language] ?? []).filter((d) => d.level === level && isDossierVisible(d, policy));
}

/** A dossier of a language by its id, visible or not (server side only). */
export function findDossier(language: Language, id: string): AssessmentDossier | undefined {
  return (ASSESSMENT_DOSSIERS[language] ?? []).find((d) => d.id === id);
}

/** Whether the language has at least one visible dossier, at any level. */
export function hasVisibleDossier(language: Language, policy: AssessmentDraftPolicy): boolean {
  return (ASSESSMENT_DOSSIERS[language] ?? []).some((d) => isDossierVisible(d, policy));
}

export type ListeningMode = "audio" | "draft-script" | "youtube" | "unavailable";

/**
 * How the listening test of a dossier is offered: the recording when there is one; the script,
 * marked as a draft, only for a dossier without recording under the "show" policy (local work);
 * otherwise not at all. The script never goes to a learner outside that last case. A dossier whose
 * listening is a YouTube passage is always played from the video, whatever the policy.
 */
export function listeningMode(dossier: AssessmentDossier, policy: AssessmentDraftPolicy): ListeningMode {
  if (dossier.listening.source === "youtube") return "youtube";
  if (dossier.audio !== null) return "audio";
  return policy === "show" ? "draft-script" : "unavailable";
}

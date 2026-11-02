"use server";

import { findDossier, readAssessmentDraftPolicy, visibleDossiers } from "@/lib/assessment/policy";
import { UserFacingError } from "@/lib/data/errors";
import { levelsToOffer, receptionLevel } from "@/lib/domain/assessment";
import type { CefrLevel } from "@/lib/schemas/common";
import {
  applyAssessmentLevelInputSchema,
  gradeAssessmentInputSchema,
  saveAssessmentAnswersInputSchema,
  startAssessmentInputSchema,
  type AssessmentGradingResult,
} from "@/lib/schemas/assessment";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/**
 * Grades the assessment in progress (see the repository). The user is the one of the session; the
 * demo is refused by `runAction`. Can take several seconds: it calls the language model.
 */
export async function gradeAssessment(input: unknown): Promise<ActionResult<AssessmentGradingResult>> {
  return runAction(gradeAssessmentInputSchema, input, (repo, { assessmentId }) => repo.gradeAssessment(assessmentId));
}

/**
 * Starts the assessment of a language, or resumes the one in progress. The server picks the dossier:
 * the level is the learner's current one, or the one above when `higher` is asked and the latest
 * graded assessment of the language confirmed its level with room to go. Among the visible dossiers
 * of that level, the first one the learner has not graded yet, else the first. The browser never
 * names a dossier.
 */
export async function startAssessment(input: unknown): Promise<ActionResult<{ assessmentId: string }>> {
  return runAction(startAssessmentInputSchema, input, async (repo, { language, higher }) => {
    const preferences = await repo.getPreferences();
    const goal = preferences?.goals.find((g) => g.language === language);
    if (!goal) throw new UserFacingError("Cette langue ne fait pas partie de tes langues.");

    const graded = (await repo.listAssessments(language)).filter((a) => a.status === "graded");
    let level: CefrLevel = goal.level;
    if (higher) {
      const latest = graded[0];
      const dossier = latest ? findDossier(language, latest.dossierId) : undefined;
      const offered = latest?.results && dossier ? levelsToOffer(dossier.level, latest.results)[0] : undefined;
      if (!offered) throw new UserFacingError("Un dossier plus difficile n’est pas proposé pour l’instant.");
      level = offered;
    }

    const visible = visibleDossiers(language, level, readAssessmentDraftPolicy());
    if (visible.length === 0) throw new UserFacingError("Le bilan n’est pas encore disponible à ce niveau.");
    const done = new Set(graded.map((a) => a.dossierId));
    const dossier = visible.find((d) => !done.has(d.id)) ?? visible[0];
    return { assessmentId: await repo.startAssessment(language, dossier.id) };
  });
}

/** Saves the answers so far and the listening plays of the assessment in progress. */
export async function saveAssessmentAnswers(input: unknown): Promise<ActionResult> {
  return runAction(saveAssessmentAnswersInputSchema, input, (repo, { assessmentId, answers, listeningPlays }) =>
    repo.saveAssessmentAnswers(assessmentId, answers, listeningPlays),
  );
}

/**
 * Sets the learner's level for the language of a graded assessment to its reception level. The input
 * holds no level: the server reads the stored results, and only the latest graded assessment of the
 * language can be applied.
 */
export async function applyAssessmentLevel(input: unknown): Promise<ActionResult<{ level: CefrLevel }>> {
  return runAction(applyAssessmentLevelInputSchema, input, async (repo, { assessmentId }) => {
    const all = await repo.listAssessments();
    const assessment = all.find((a) => a.id === assessmentId);
    if (!assessment || assessment.status !== "graded" || !assessment.results) {
      throw new UserFacingError("Ce bilan est introuvable ou n’est pas terminé.");
    }
    const latest = all.find((a) => a.language === assessment.language && a.status === "graded");
    if (latest?.id !== assessment.id) throw new UserFacingError("Un bilan plus récent existe pour cette langue.");
    const level = receptionLevel(assessment.results);
    if (!level) throw new UserFacingError("Ce bilan n’évalue ni la lecture ni l’écoute : ton niveau ne change pas.");
    await repo.applyAssessmentLevel(assessmentId, level);
    return { level };
  });
}

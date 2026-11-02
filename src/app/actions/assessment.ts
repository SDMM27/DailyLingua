"use server";

import { gradeAssessmentInputSchema, type AssessmentGradingResult } from "@/lib/schemas/assessment";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/**
 * Grades the assessment in progress (see the repository). The user is the one of the session; the
 * demo is refused by `runAction`. Can take several seconds: it calls the language model.
 */
export async function gradeAssessment(input: unknown): Promise<ActionResult<AssessmentGradingResult>> {
  return runAction(gradeAssessmentInputSchema, input, (repo, { assessmentId }) => repo.gradeAssessment(assessmentId));
}

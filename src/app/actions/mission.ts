"use server";

import {
  answerQuestionInputSchema,
  saveExpressionInputSchema,
  saveProductionInputSchema,
  setActivityDoneInputSchema,
} from "@/lib/schemas/mission";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

export async function setActivityDone(input: unknown): Promise<ActionResult> {
  return runAction(setActivityDoneInputSchema, input, (repo, { activityId, done }) =>
    repo.setActivityDone(activityId, done),
  );
}

export async function answerQuestion(input: unknown): Promise<ActionResult> {
  return runAction(answerQuestionInputSchema, input, (repo, { sessionId, questionId, selectedIndex }) =>
    repo.answerQuestion(sessionId, questionId, selectedIndex),
  );
}

export async function saveProduction(input: unknown): Promise<ActionResult> {
  return runAction(saveProductionInputSchema, input, (repo, { sessionId, body }) =>
    repo.saveProduction(sessionId, body),
  );
}

export async function saveExpression(input: unknown): Promise<ActionResult> {
  return runAction(saveExpressionInputSchema, input, (repo, { sessionId, expressionId }) =>
    repo.saveExpression(sessionId, expressionId),
  );
}

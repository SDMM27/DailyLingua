"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { PrepareMissionResult } from "@/lib/data/repository";
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

/** Writes today's mission if it is missing; the day is the user's today, computed on the server. Call with `{}`. */
export async function prepareTodayMission(input: unknown): Promise<ActionResult<PrepareMissionResult>> {
  const result = await runAction(z.object({}), input, (repo) => repo.prepareTodayMission());
  // The page re-renders with the mission in the action's own response (a client-side
  // router.refresh() right after the action was not reliably applied).
  if (result.ok && result.data.status === "ready") refresh();
  return result;
}

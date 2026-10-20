"use server";

import { revalidatePath } from "next/cache";
import {
  addCorrectionCardInputSchema,
  correctionCardIdInputSchema,
  reviewCorrectionInputSchema,
  type CorrectionCard,
} from "@/lib/schemas/correction-card";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/** Keeps a correction as a review card (idempotent). */
export async function addCorrectionCard(input: unknown): Promise<ActionResult> {
  const result = await runAction(addCorrectionCardInputSchema, input, (repo, { sessionId, correctionIndex }) =>
    repo.addCorrectionCard(sessionId, correctionIndex),
  );
  if (result.ok) revalidatePath("/productions");
  return result;
}

export async function reviewCorrection(input: unknown): Promise<ActionResult<CorrectionCard>> {
  return runAction(reviewCorrectionInputSchema, input, (repo, data) => repo.reviewCorrectionCard(data));
}

export async function deleteCorrectionCard(input: unknown): Promise<ActionResult> {
  const result = await runAction(correctionCardIdInputSchema, input, (repo, { id }) => repo.deleteCorrectionCard(id));
  if (result.ok) revalidatePath("/productions");
  return result;
}

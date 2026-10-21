"use server";

import { revalidatePath } from "next/cache";
import type { GrammarPracticeResult } from "@/lib/domain/grammar";
import { grammarCardIdInputSchema, recordGrammarPracticeInputSchema } from "@/lib/schemas/grammar";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/** Records one run through the exercises of a grammar point (creates or reviews its card). */
export async function recordGrammarPractice(input: unknown): Promise<ActionResult<GrammarPracticeResult>> {
  const result = await runAction(recordGrammarPracticeInputSchema, input, (repo, data) =>
    repo.recordGrammarPractice(data),
  );
  if (result.ok) {
    revalidatePath("/grammaire");
    revalidatePath("/");
  }
  return result;
}

export async function deleteGrammarCard(input: unknown): Promise<ActionResult> {
  const result = await runAction(grammarCardIdInputSchema, input, (repo, { id }) => repo.deleteGrammarCard(id));
  if (result.ok) {
    revalidatePath("/grammaire");
    revalidatePath("/");
  }
  return result;
}

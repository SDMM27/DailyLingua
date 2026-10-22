"use server";

import { revalidatePath } from "next/cache";
import type { AlphabetCheckResult, AlphabetPracticeResult } from "@/lib/domain/alphabet";
import { recordAlphabetCheckInputSchema, recordAlphabetPracticeInputSchema } from "@/lib/schemas/alphabet";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/** Records one run through the exercises of a group of letters (creates or reviews its card). */
export async function recordAlphabetPractice(input: unknown): Promise<ActionResult<AlphabetPracticeResult>> {
  const result = await runAction(recordAlphabetPracticeInputSchema, input, (repo, data) =>
    repo.recordAlphabetPractice(data),
  );
  if (result.ok) {
    revalidatePath("/alphabet");
    revalidatePath("/");
  }
  return result;
}

/** Grades the reading check of a language; a pass marks every group of its alphabet as known. */
export async function recordAlphabetCheck(input: unknown): Promise<ActionResult<AlphabetCheckResult>> {
  const result = await runAction(recordAlphabetCheckInputSchema, input, (repo, data) => repo.recordAlphabetCheck(data));
  if (result.ok) {
    revalidatePath("/alphabet");
    revalidatePath("/");
  }
  return result;
}

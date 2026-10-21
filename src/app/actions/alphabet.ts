"use server";

import { revalidatePath } from "next/cache";
import type { AlphabetPracticeResult } from "@/lib/domain/alphabet";
import { recordAlphabetPracticeInputSchema } from "@/lib/schemas/alphabet";
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

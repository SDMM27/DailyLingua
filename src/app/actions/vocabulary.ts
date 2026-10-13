"use server";

import {
  newVocabularyInputSchema,
  reviewInputSchema,
  wordIdInputSchema,
  wordStatusInputSchema,
  type VocabularyItem,
} from "@/lib/schemas/vocabulary";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

export async function addWord(input: unknown): Promise<ActionResult<VocabularyItem>> {
  return runAction(newVocabularyInputSchema, input, (repo, data) => repo.addVocabulary(data));
}

export async function reviewWord(input: unknown): Promise<ActionResult<VocabularyItem>> {
  return runAction(reviewInputSchema, input, (repo, data) => repo.reviewVocabulary(data));
}

export async function setWordStatus(input: unknown): Promise<ActionResult> {
  return runAction(wordStatusInputSchema, input, (repo, { id, status }) => repo.setVocabularyStatus(id, status));
}

export async function deleteWord(input: unknown): Promise<ActionResult> {
  return runAction(wordIdInputSchema, input, (repo, { id }) => repo.deleteVocabulary(id));
}

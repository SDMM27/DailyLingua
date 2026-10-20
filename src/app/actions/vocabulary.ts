"use server";

import {
  importVocabularyInputSchema,
  newVocabularyInputSchema,
  newVocabularyListInputSchema,
  reviewInputSchema,
  translateVocabularyInputSchema,
  updateVocabularyListInputSchema,
  vocabularyListIdInputSchema,
  wordIdInputSchema,
  wordStatusInputSchema,
  type ImportVocabularyResult,
  type VocabularyItem,
  type VocabularyList,
  type VocabularyTranslationResult,
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

export async function createList(input: unknown): Promise<ActionResult<VocabularyList>> {
  return runAction(newVocabularyListInputSchema, input, (repo, data) => repo.createVocabularyList(data));
}

export async function updateList(input: unknown): Promise<ActionResult<VocabularyList>> {
  return runAction(updateVocabularyListInputSchema, input, (repo, data) => repo.updateVocabularyList(data));
}

/** Deletes the list and its words. */
export async function deleteList(input: unknown): Promise<ActionResult> {
  return runAction(vocabularyListIdInputSchema, input, (repo, { id }) => repo.deleteVocabularyList(id));
}

export async function importWords(input: unknown): Promise<ActionResult<ImportVocabularyResult>> {
  return runAction(importVocabularyInputSchema, input, (repo, data) => repo.importVocabulary(data));
}

/** Suggestions only: nothing is saved until the user validates the import. */
export async function translateWords(input: unknown): Promise<ActionResult<VocabularyTranslationResult>> {
  return runAction(translateVocabularyInputSchema, input, (repo, data) => repo.suggestTranslations(data));
}

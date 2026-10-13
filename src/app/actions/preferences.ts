"use server";

import { preferencesSchema } from "@/lib/schemas/preferences";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/** Saves the preferences; also completes the first-run screen (a new user has no language yet). */
export async function savePreferences(input: unknown): Promise<ActionResult> {
  return runAction(preferencesSchema, input, (repo, preferences) => repo.savePreferences(preferences));
}

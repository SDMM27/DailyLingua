"use server";

import { UserFacingError } from "@/lib/data/errors";
import { languageInfo } from "@/lib/domain/languages";
import { sourceAccessInputSchema } from "@/lib/schemas/content";
import { preferencesSchema } from "@/lib/schemas/preferences";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/**
 * Saves the preferences; also completes the first-run screen (a new user has no language yet).
 * A language can only be added if it has a content source under the licence policy. One the user
 * already studies is kept even if its sources went away: removing it is their choice.
 */
export async function savePreferences(input: unknown): Promise<ActionResult> {
  return runAction(preferencesSchema, input, async (repo, preferences) => {
    const [available, current] = await Promise.all([repo.listAvailableLanguages(), repo.getPreferences()]);
    const kept = new Set(current?.goals.map((g) => g.language));
    const refused = preferences.goals.filter((g) => !available.includes(g.language) && !kept.has(g.language));
    if (refused.length > 0) {
      const names = refused.map((g) => languageInfo(g.language).nameFr).join(", ");
      throw new UserFacingError(`Aucune source de contenus n’est disponible pour : ${names}.`);
    }
    await repo.savePreferences(preferences);
  });
}

/** « J'y ai accès »: declares (or withdraws) access to a paid source; missions may then use it. */
export async function setSourceAccess(input: unknown): Promise<ActionResult> {
  return runAction(sourceAccessInputSchema, input, async (repo, { sourceId, hasAccess }) => {
    await repo.setSourceAccess(sourceId, hasAccess);
  });
}

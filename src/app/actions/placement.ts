"use server";

import { UserFacingError } from "@/lib/data/errors";
import type { DailyLinguaRepository } from "@/lib/data/repository";
import { replayPlacement } from "@/lib/domain/placement";
import { PLACEMENT_BANKS, placementItems } from "@/lib/placement/banks";
import type { CefrLevel, Language } from "@/lib/schemas/common";
import {
  completePlacementInputSchema,
  skipPlacementInputSchema,
  type PlacementConfidence,
} from "@/lib/schemas/placement";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

async function requireStudied(repo: DailyLinguaRepository, language: Language): Promise<void> {
  const preferences = await repo.getPreferences();
  if (!preferences?.goals.some((g) => g.language === language)) {
    throw new UserFacingError("Cette langue ne fait pas partie de tes langues.");
  }
}

/**
 * Saves a finished placement test. The client only sends its answers: the server replays them
 * against the bank to compute the estimate itself, then stores it with the level the learner
 * chose, which becomes their current level for that language.
 */
export async function completePlacementTest(
  input: unknown,
): Promise<ActionResult<{ estimate: CefrLevel; confidence: PlacementConfidence }>> {
  return runAction(completePlacementInputSchema, input, async (repo, test) => {
    await requireStudied(repo, test.language);
    const items = placementItems(test.language, test.variant);
    const replay = replayPlacement(items, test.startLevel, test.answers);
    if (!replay.ok) {
      console.error(`Placement test refused (${test.language}, ${test.variant}): ${replay.reason}`);
      throw new UserFacingError("Le test n’a pas pu être vérifié. Recommence-le.");
    }
    await repo.recordPlacementTest({
      status: "completed",
      language: test.language,
      variant: test.variant,
      startLevel: test.startLevel,
      estimatedLevel: replay.estimate,
      confidence: replay.confidence,
      chosenLevel: test.chosenLevel,
      answers: test.answers.map((a) => ({
        itemId: a.itemId,
        choice: a.choice,
        // The replay checked that every answer is a question of the bank.
        correct: items.find((item) => item.id === a.itemId)?.answer === a.choice,
      })),
      bankVersion: PLACEMENT_BANKS[test.language].version,
    });
    return { estimate: replay.estimate, confidence: replay.confidence };
  });
}

/** Records that the learner passed on the placement test of a language: their level is unchanged. */
export async function skipPlacementTest(input: unknown): Promise<ActionResult> {
  return runAction(skipPlacementInputSchema, input, async (repo, { language }) => {
    await requireStudied(repo, language);
    await repo.recordPlacementTest({ status: "skipped", language });
  });
}

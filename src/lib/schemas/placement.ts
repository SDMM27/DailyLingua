import { z } from "zod";
import { cefrLevelSchema, languageSchema, type CefrLevel, type Language } from "./common";
import {
  placementAnswerSchema,
  PLACEMENT_MAX_ITEMS,
  placementConfidenceSchema,
  type PlacementConfidence,
} from "@dailylingua/schemas";

/**
 * Placement test: a curated bank of multiple-choice questions per language. The questions, the
 * banks' schema and the answers' schema are shared with `apps/web` in `@dailylingua/schemas`; the
 * banks of Russian and Italian are in `@dailylingua/content`, the others in `src/lib/placement/banks/`.
 * The adaptive engine is in `@dailylingua/core` (`src/lib/domain/placement.ts` re-exports it).
 */

export {
  PLACEMENT_BANK_ANSWER_USES,
  PLACEMENT_BANK_ITEMS_PER_LEVEL,
  PLACEMENT_BANK_SKILLS_PER_LEVEL,
  PLACEMENT_CONFIDENCES,
  PLACEMENT_GAP,
  PLACEMENT_ITEMS_PER_LEVEL,
  PLACEMENT_MAX_ITEMS,
  PLACEMENT_SKILLS,
  placementAnswerSchema,
  placementBankSchema,
  placementConfidenceSchema,
  placementItemSchema,
  placementSkillSchema,
  type PlacementAnswer,
  type PlacementBank,
  type PlacementConfidence,
  type PlacementItem,
  type PlacementSkill,
} from "@dailylingua/schemas";

/** Finished test: the server replays the answers to compute the estimate itself. */
export const completePlacementInputSchema = z.object({
  language: languageSchema,
  /** Level the test started at (the declared level when it began). */
  startLevel: cefrLevelSchema,
  answers: z.array(placementAnswerSchema).min(1).max(PLACEMENT_MAX_ITEMS),
  /** Level the learner keeps: the estimate or the one they picked instead. */
  chosenLevel: cefrLevelSchema,
});
export type CompletePlacementInput = z.infer<typeof completePlacementInputSchema>;

export const skipPlacementInputSchema = z.object({ language: languageSchema });

/** Latest test of a language, completed or skipped. */
export const placementSummarySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("completed"),
    language: languageSchema,
    estimatedLevel: cefrLevelSchema,
    confidence: placementConfidenceSchema,
    chosenLevel: cefrLevelSchema,
    takenAt: z.iso.datetime({ offset: true }),
  }),
  z.object({
    status: z.literal("skipped"),
    language: languageSchema,
    takenAt: z.iso.datetime({ offset: true }),
  }),
]);
export type PlacementSummary = z.infer<typeof placementSummarySchema>;

/** What the repository stores: the server-computed result of a test, or its skipping. */
export type PlacementRecord =
  | {
      status: "completed";
      language: Language;
      startLevel: CefrLevel;
      estimatedLevel: CefrLevel;
      confidence: PlacementConfidence;
      chosenLevel: CefrLevel;
      answers: { itemId: string; choice: number | null; correct: boolean }[];
      bankVersion: string;
    }
  | { status: "skipped"; language: Language };

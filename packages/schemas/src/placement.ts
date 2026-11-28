import { z } from "zod";
import { cefrLevels, cefrLevelSchema, dateKeySchema, languageCodeSchema } from "./common";

/**
 * Placement test: a curated bank of multiple-choice questions per language. The adaptive engine is
 * `nextPlacementStep` and the others in `@dailylingua/core`; the banks of the languages that offer the
 * test are in `@dailylingua/content`. The engine asks blocks of `PLACEMENT_ITEMS_PER_LEVEL`
 * questions at one level, at most 30 in all.
 */

export const PLACEMENT_SKILLS = ["grammar", "vocabulary", "reading"] as const;
export const placementSkillSchema = z.enum(PLACEMENT_SKILLS);
export type PlacementSkill = z.infer<typeof placementSkillSchema>;

/** Size of a block: the engine asks this many questions at one level before deciding. */
export const PLACEMENT_ITEMS_PER_LEVEL = 5;
/** Most questions of a test: one block per level. */
export const PLACEMENT_MAX_ITEMS = cefrLevels.length * PLACEMENT_ITEMS_PER_LEVEL;
/** Questions per level in a bank (two blocks' worth, so a block never runs out). */
export const PLACEMENT_BANK_ITEMS_PER_LEVEL = 10;
/** Questions per skill and per level in a bank. */
export const PLACEMENT_BANK_SKILLS_PER_LEVEL: Record<PlacementSkill, number> = {
  grammar: 4,
  vocabulary: 3,
  reading: 3,
};
/** Each position of the right answer (0 to 3) is used this many times over a bank of 60. */
export const PLACEMENT_BANK_ANSWER_USES = { min: 14, max: 16 } as const;
/** Marks the gap of grammar and vocabulary prompts. */
export const PLACEMENT_GAP = "___";

const LEVEL_IN_ID = "(a1|a2|b1|b2|c1|c2)";

export const placementItemSchema = z
  .object({
    /**
     * Stable and unique across all banks. Format `<lang>-<level>-<n>` with n from 1 to 10, e.g.
     * `ru-b1-7`.
     */
    id: z.string().regex(new RegExp(`^[a-z]{2,3}-${LEVEL_IN_ID}-(?:[1-9]|10)$`)),
    level: cefrLevelSchema,
    skill: placementSkillSchema,
    /** Short passage in the studied language, reading questions only. */
    context: z.string().trim().min(1).max(600).optional(),
    /** In the studied language. Grammar and vocabulary prompts contain the gap `___`. */
    prompt: z.string().trim().min(1).max(300),
    /** Four options in the studied language; exactly one is correct. */
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    answer: z.number().int().min(0).max(3),
  })
  .refine((item) => item.options.every((o) => o.trim().length > 0 && o.length <= 120), {
    message: "Options must be non-empty and short",
  })
  .refine((item) => new Set(item.options.map((o) => o.trim())).size === 4, {
    message: "Options must be distinct",
  })
  .refine((item) => (item.skill === "reading") === (item.context !== undefined), {
    message: "Reading questions, and only them, have a context",
  })
  .refine((item) => item.skill === "reading" || item.prompt.includes(PLACEMENT_GAP), {
    message: "Grammar and vocabulary prompts contain the gap",
  });
export type PlacementItem = z.infer<typeof placementItemSchema>;

/**
 * Approved by two independent passes of the reviewer agents, then the arbiter; `rubric` = version of
 * the grid.
 */
export const placementAiReviewSchema = z.object({
  on: dateKeySchema,
  model: z.string().trim().min(1).max(60),
  rubric: z.string().trim().min(1).max(40),
});

const VERSION = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Bank format: a flat list of 60 questions, 10 per level (4 grammar, 3 vocabulary, 3 reading). */
export const placementBankSchema = z
  .object({
    language: languageCodeSchema,
    /** Bumped when questions change, stored with each result. */
    version: VERSION,
    aiReview: placementAiReviewSchema.optional(),
    items: z.array(placementItemSchema).length(cefrLevels.length * PLACEMENT_BANK_ITEMS_PER_LEVEL),
  })
  .superRefine((bank, ctx) => {
    for (const level of cefrLevels) {
      const atLevel = bank.items.filter((item) => item.level === level);
      if (atLevel.length !== PLACEMENT_BANK_ITEMS_PER_LEVEL) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: `${level} has ${atLevel.length} questions, expected ${PLACEMENT_BANK_ITEMS_PER_LEVEL}`,
        });
        continue;
      }
      for (const skill of PLACEMENT_SKILLS) {
        const count = atLevel.filter((item) => item.skill === skill).length;
        if (count !== PLACEMENT_BANK_SKILLS_PER_LEVEL[skill]) {
          ctx.addIssue({
            code: "custom",
            path: ["items"],
            message: `${level} has ${count} ${skill} questions, expected ${PLACEMENT_BANK_SKILLS_PER_LEVEL[skill]}`,
          });
        }
      }
    }
    const counts = [0, 1, 2, 3].map((i) => bank.items.filter((item) => item.answer === i).length);
    if (counts.some((c) => c < PLACEMENT_BANK_ANSWER_USES.min || c > PLACEMENT_BANK_ANSWER_USES.max)) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: `answer positions ${counts.join("/")}, each must be used ${PLACEMENT_BANK_ANSWER_USES.min} to ${PLACEMENT_BANK_ANSWER_USES.max} times`,
      });
    }
  });
export type PlacementBank = z.infer<typeof placementBankSchema>;

export const PLACEMENT_CONFIDENCES = ["low", "medium", "high"] as const;
export const placementConfidenceSchema = z.enum(PLACEMENT_CONFIDENCES);
export type PlacementConfidence = z.infer<typeof placementConfidenceSchema>;

/** One answer as sent by the client; `choice` null means "I don't know" (counted as wrong). */
export const placementAnswerSchema = z.object({
  itemId: z.string().min(1).max(20),
  choice: z.number().int().min(0).max(3).nullable(),
});
export type PlacementAnswer = z.infer<typeof placementAnswerSchema>;

/** Finished test as the web app sends it: the server replays the answers to compute the estimate itself. */
export const completePlacementInput = z.strictObject({
  language: languageCodeSchema,
  /** Level the test started at (the declared level when it began). */
  startLevel: cefrLevelSchema,
  answers: z.array(placementAnswerSchema).min(1).max(PLACEMENT_MAX_ITEMS),
  /** Level the learner keeps: the estimate or the one they picked instead. */
  chosenLevel: cefrLevelSchema,
});
export type CompletePlacementInput = z.infer<typeof completePlacementInput>;

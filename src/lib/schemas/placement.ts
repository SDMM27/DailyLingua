import { z } from "zod";
import { cefrLevelSchema, languageSchema, CEFR_LEVELS, type CefrLevel, type Language } from "./common";

/**
 * Placement test: a curated bank of multiple-choice questions per language, in two variants
 * matching the learning purpose (everyday language or professional register). Banks live in
 * `src/lib/placement/banks/`; the adaptive engine is `src/lib/domain/placement.ts`.
 */

export const PLACEMENT_VARIANTS = ["everyday", "professional"] as const;
export const placementVariantSchema = z.enum(PLACEMENT_VARIANTS);
export type PlacementVariant = z.infer<typeof placementVariantSchema>;

export const PLACEMENT_SKILLS = ["grammar", "vocabulary", "reading"] as const;
export const placementSkillSchema = z.enum(PLACEMENT_SKILLS);
export type PlacementSkill = z.infer<typeof placementSkillSchema>;

/** Questions per CEFR level and per variant: the engine asks at most this many at one level. */
export const PLACEMENT_ITEMS_PER_LEVEL = 3;
/** Marks the gap of grammar and vocabulary prompts. */
export const PLACEMENT_GAP = "___";

export const placementItemSchema = z
  .object({
    /** Stable and unique across all banks: `<lang>-<e|p>-<level>-<n>`, e.g. `ru-e-b1-2`. */
    id: z.string().regex(/^[a-z]{2,3}-[ep]-(a1|a2|b1|b2|c1|c2)-[1-9]$/),
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

export const placementBankSchema = z.object({
  language: languageSchema,
  /** Bumped when questions change, stored with each result. */
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  variants: z.object({
    everyday: z.array(placementItemSchema).length(CEFR_LEVELS.length * PLACEMENT_ITEMS_PER_LEVEL),
    professional: z.array(placementItemSchema).length(CEFR_LEVELS.length * PLACEMENT_ITEMS_PER_LEVEL),
  }),
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

/** Finished test: the server replays the answers to compute the estimate itself. */
export const completePlacementInputSchema = z.object({
  language: languageSchema,
  variant: placementVariantSchema,
  /** Level the test started at (the declared level when it began). */
  startLevel: cefrLevelSchema,
  answers: z.array(placementAnswerSchema).min(1).max(CEFR_LEVELS.length * PLACEMENT_ITEMS_PER_LEVEL),
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
    variant: placementVariantSchema,
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
      variant: PlacementVariant;
      startLevel: CefrLevel;
      estimatedLevel: CefrLevel;
      confidence: PlacementConfidence;
      chosenLevel: CefrLevel;
      answers: { itemId: string; choice: number | null; correct: boolean }[];
      bankVersion: string;
    }
  | { status: "skipped"; language: Language };

import { z } from "zod";
import { dateKeySchema, languageSchema } from "./common";

export const REVIEW_GRADES = ["again", "hard", "good", "easy"] as const;
export const reviewGradeSchema = z.enum(REVIEW_GRADES);
export type ReviewGrade = z.infer<typeof reviewGradeSchema>;

/** How a word is recalled: `flip` is the self-graded card, the others are typed and graded by the app. */
export const REVIEW_MODES = ["flip", "translate", "produce", "listen", "cloze"] as const;
export const reviewModeSchema = z.enum(REVIEW_MODES);
export type ReviewMode = z.infer<typeof reviewModeSchema>;

export const reviewStateSchema = z.object({
  /** Leitner box, 0 = new / failed, higher = better known. */
  box: z.number().int().min(0),
  dueOn: dateKeySchema,
  lastReviewedOn: dateKeySchema.nullable(),
  reviewCount: z.number().int().nonnegative(),
});
export type ReviewState = z.infer<typeof reviewStateSchema>;

export const vocabularyItemSchema = z.object({
  id: z.string().min(1),
  language: languageSchema,
  term: z.string().trim().min(1),
  translation: z.string().trim().min(1),
  definition: z.string().trim().optional(),
  example: z.string().trim().optional(),
  source: z
    .object({ name: z.string().min(1), url: z.url().optional() })
    .optional(),
  status: z.enum(["learning", "known"]),
  review: reviewStateSchema,
  addedOn: dateKeySchema,
  /** The list the word belongs to; absent for words added from the missions or without a list. */
  listId: z.string().min(1).optional(),
});
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

/** Shape accepted from the "add a word" form. */
export const newVocabularyInputSchema = z.object({
  language: languageSchema,
  term: z.string().trim().min(1, "Le mot est obligatoire").max(120),
  translation: z.string().trim().min(1, "La traduction est obligatoire").max(200),
  definition: z.string().trim().max(500).optional(),
  example: z.string().trim().max(500).optional(),
  sourceName: z.string().trim().max(120).optional(),
  /** Must be a list of the same language. */
  listId: z.string().min(1).optional(),
});
export type NewVocabularyInput = z.infer<typeof newVocabularyInputSchema>;

export const reviewInputSchema = z.object({
  id: z.string().min(1),
  grade: reviewGradeSchema,
  /** The review count the user saw; the review is refused if the word changed since. */
  expectedReviewCount: z.number().int().nonnegative(),
  mode: reviewModeSchema.default("flip"),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

/** Reviews counted and recalled (any grade but "again") in one mode. */
export const modeRetentionSchema = z.object({
  reviews: z.number().int().nonnegative(),
  recalled: z.number().int().nonnegative(),
});
export type ModeRetention = z.infer<typeof modeRetentionSchema>;

/** Recall rate of reviews made long after the previous one, per mode (see `retentionByMode`). */
export const retentionStatsSchema = z.object({
  total: modeRetentionSchema,
  byMode: z.record(reviewModeSchema, modeRetentionSchema),
});
export type RetentionStats = z.infer<typeof retentionStatsSchema>;

export const wordStatusInputSchema = z.object({ id: z.string().min(1), status: z.enum(["learning", "known"]) });
export const wordIdInputSchema = z.object({ id: z.string().min(1) });

// Lists ------------------------------------------------------------------------------------------

export const VOCABULARY_LIST_LIMITS = { name: 80, description: 300 } as const;

export const vocabularyListSchema = z.object({
  id: z.string().min(1),
  language: languageSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  /** False: the list is paused, its words stay visible but leave the daily review. */
  active: z.boolean(),
});
export type VocabularyList = z.infer<typeof vocabularyListSchema>;

const listNameSchema = z
  .string()
  .trim()
  .min(1, "Le nom de la liste est obligatoire")
  .max(VOCABULARY_LIST_LIMITS.name, "Le nom de la liste est trop long (80 caractères au plus)");
const listDescriptionSchema = z
  .string()
  .trim()
  .max(VOCABULARY_LIST_LIMITS.description, "La description est trop longue (300 caractères au plus)");

export const newVocabularyListInputSchema = z.object({
  language: languageSchema,
  name: listNameSchema,
  description: listDescriptionSchema.optional(),
});
export type NewVocabularyListInput = z.infer<typeof newVocabularyListInputSchema>;

/** An empty description clears it. */
export const updateVocabularyListInputSchema = z.object({
  id: z.string().min(1),
  name: listNameSchema.optional(),
  description: listDescriptionSchema.optional(),
  active: z.boolean().optional(),
});
export type UpdateVocabularyListInput = z.infer<typeof updateVocabularyListInputSchema>;

export const vocabularyListIdInputSchema = z.object({ id: z.string().min(1) });

// Import -----------------------------------------------------------------------------------------

export const VOCABULARY_IMPORT_LIMITS = { entries: 200, term: 120, translation: 200, example: 500 } as const;

export const importEntrySchema = z.object({
  term: z.string().trim().min(1, "Le mot est obligatoire").max(VOCABULARY_IMPORT_LIMITS.term, "Le mot est trop long"),
  translation: z
    .string()
    .trim()
    .min(1, "La traduction est obligatoire")
    .max(VOCABULARY_IMPORT_LIMITS.translation, "La traduction est trop longue"),
  example: z.string().trim().max(VOCABULARY_IMPORT_LIMITS.example, "L’exemple est trop long").optional(),
});
export type ImportEntry = z.infer<typeof importEntrySchema>;

/** Words to add in one go, to an existing list, to a new one, or to none. */
export const importVocabularyInputSchema = z
  .object({
    language: languageSchema,
    listId: z.string().min(1).optional(),
    newListName: listNameSchema.optional(),
    entries: z
      .array(importEntrySchema)
      .min(1, "Aucun mot à enregistrer")
      .max(VOCABULARY_IMPORT_LIMITS.entries, "200 mots au plus par import"),
  })
  .refine((input) => input.listId === undefined || input.newListName === undefined, {
    message: "Choisis une liste existante ou une nouvelle liste, pas les deux.",
  });
export type ImportVocabularyInput = z.infer<typeof importVocabularyInputSchema>;

export interface ImportVocabularyResult {
  added: VocabularyItem[];
  /** Terms left out because the user already had them. */
  skipped: string[];
  /** The list created by this import, when `newListName` was given. */
  list?: VocabularyList;
}

// Automatic translation --------------------------------------------------------------------------

export const VOCABULARY_TRANSLATION_LIMITS = { termsPerRequest: 50, termsPerDay: 200, term: 120 } as const;

export const translateVocabularyInputSchema = z.object({
  language: languageSchema,
  terms: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Le mot est obligatoire")
        .max(VOCABULARY_TRANSLATION_LIMITS.term, "Le mot est trop long"),
    )
    .min(1, "Aucun mot à traduire")
    .max(VOCABULARY_TRANSLATION_LIMITS.termsPerRequest, "50 mots au plus par demande"),
});
export type TranslateVocabularyInput = z.infer<typeof translateVocabularyInputSchema>;

export interface SuggestedTranslation {
  /** The term as the user sent it. */
  term: string;
  translation: string;
  /** The model doubts the term (misspelled, ambiguous): the user should check it first. */
  uncertain: boolean;
}

/**
 * `guest`: guests cannot use it (cost); `limit`: the day's quota is used up; `unavailable`: off, or
 * the model failed (nothing was lost, the user types the translations).
 */
export type VocabularyTranslationResult =
  | { status: "ready"; translations: SuggestedTranslation[] }
  | { status: "guest" | "limit" | "unavailable" };

/** Wire format: what the model returns. Plain types only, bounds are checked on our side. */
export const wireVocabularyTranslationSchema = z.object({
  items: z.array(
    z.object({
      term: z.string().describe("The term, copied exactly as given."),
      translation_fr: z
        .string()
        .describe("In French: the main senses, separated by commas, at most 3. Short."),
      uncertain: z
        .boolean()
        .describe("True when the term looks misspelled or is too ambiguous to translate reliably."),
    }),
  ),
});
export type WireVocabularyTranslation = z.infer<typeof wireVocabularyTranslationSchema>;

import { z } from "zod";
import { dateKeySchema, languageSchema } from "./common";

export const REVIEW_GRADES = ["again", "hard", "good", "easy"] as const;
export const reviewGradeSchema = z.enum(REVIEW_GRADES);
export type ReviewGrade = z.infer<typeof reviewGradeSchema>;

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
});
export type NewVocabularyInput = z.infer<typeof newVocabularyInputSchema>;

import { z } from "zod";
import { dateKeySchema, languageSchema } from "./common";
import { reviewGradeSchema, reviewStateSchema } from "./vocabulary";
import { CORRECTION_CATEGORIES, WRITING_FEEDBACK_LIMITS } from "./writing-feedback";

const lastIndex = WRITING_FEEDBACK_LIMITS.corrections.max - 1;

/** One correction of a written review kept as a spaced-repetition card ("Mes erreurs à revoir"). */
export const correctionCardSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  /** Position of the correction in the review of that session. */
  correctionIndex: z.number().int().min(0).max(lastIndex),
  language: languageSchema,
  original: z.string().min(1),
  corrected: z.string().min(1),
  explanation: z.string().min(1),
  category: z.enum(CORRECTION_CATEGORIES).optional(),
  status: z.enum(["learning", "known"]),
  review: reviewStateSchema,
  addedOn: dateKeySchema,
});
export type CorrectionCard = z.infer<typeof correctionCardSchema>;

export const addCorrectionCardInputSchema = z.object({
  sessionId: z.string().min(1),
  correctionIndex: z.number().int().min(0).max(lastIndex),
});
export type AddCorrectionCardInput = z.infer<typeof addCorrectionCardInputSchema>;

export const reviewCorrectionInputSchema = z.object({
  id: z.string().min(1),
  grade: reviewGradeSchema,
  /** The review count the user saw; the review is refused if the card changed since. */
  expectedReviewCount: z.number().int().nonnegative(),
});
export type ReviewCorrectionInput = z.infer<typeof reviewCorrectionInputSchema>;

export const correctionCardIdInputSchema = z.object({ id: z.string().min(1) });

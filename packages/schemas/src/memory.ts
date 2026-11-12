import { z } from "zod";
import { isoInstantSchema, languageCodeSchema } from "./common";

export const cardKinds = ["word", "chunk", "grammar", "script", "correction"] as const;
export const cardKindSchema = z.enum(cardKinds);
export type CardKind = z.infer<typeof cardKindSchema>;

export const cardStates = ["new", "learning", "review", "relearning", "suspended", "known"] as const;
export const cardStateSchema = z.enum(cardStates);
export type CardState = z.infer<typeof cardStateSchema>;

/** 1 again, 2 hard, 3 good, 4 easy. */
export const reviewRatingSchema = z.number().int().min(1).max(4);
export type ReviewRating = z.infer<typeof reviewRatingSchema>;

export const cardSources = ["mission", "manual", "import", "reader", "unit", "feedback", "legacy"] as const;
export const cardSourceSchema = z.enum(cardSources);
export type CardSource = z.infer<typeof cardSourceSchema>;

export const reviewOrigins = ["fsrs", "leitner"] as const;
export const reviewOriginSchema = z.enum(reviewOrigins);
export type ReviewOrigin = z.infer<typeof reviewOriginSchema>;

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const cardSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  language: languageCodeSchema,
  kind: cardKindSchema,
  /** Stable identifier of curated content (grammar point, letter group). */
  ref: z.string().nullable(),
  front: z.string().min(1),
  back: z.string().nullable(),
  /** Language `back` is written in. */
  backLanguage: languageCodeSchema.nullable(),
  context: z.string().nullable(),
  note: z.string().nullable(),
  listId: z.uuid().nullable(),
  state: cardStateSchema,
  /** Days. */
  stability: z.number().positive().nullable(),
  difficulty: z.number().min(1).max(10).nullable(),
  dueAt: isoInstantSchema,
  lastReviewAt: isoInstantSchema.nullable(),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  legacyBox: z.number().int().min(0).nullable(),
  source: cardSourceSchema,
  payload: jsonObjectSchema,
  createdAt: isoInstantSchema,
  updatedAt: isoInstantSchema,
});
export type Card = z.infer<typeof cardSchema>;

export const reviewLogSchema = z.object({
  id: z.number().int().nonnegative(),
  userId: z.uuid(),
  cardId: z.uuid(),
  rating: reviewRatingSchema,
  mode: z.string().nullable(),
  reviewedAt: isoInstantSchema,
  elapsedDays: z.number().nullable(),
  scheduledDays: z.number().nullable(),
  origin: reviewOriginSchema,
  clientEventId: z.uuid().nullable(),
  createdAt: isoInstantSchema,
});
export type ReviewLog = z.infer<typeof reviewLogSchema>;

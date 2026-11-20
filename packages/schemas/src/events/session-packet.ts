import { z } from "zod";
import { cefrLevelSchema, dateKeySchema, isoInstantSchema, languageCodeSchema } from "../common";
import { cardKindSchema, cardStateSchema } from "../memory";
import { sessionStepSchema } from "./client-events";

/**
 * The session packet served by `GET /api/session/today` (`j2-architecture.md` §5): everything the phone
 * needs to run the day offline, answer keys included (decision A1: the server grades again anyway).
 * Stored in IndexedDB by the app; never cached by HTTP.
 */
const jsonObjectSchema = z.record(z.string(), z.unknown());

export const sessionFormats = [10, 15, 20, 30] as const;
export const sessionFormatSchema = z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)]);
export type SessionFormat = z.infer<typeof sessionFormatSchema>;

export const sessionKinds = ["daily", "catch_up", "review_only"] as const;
export const sessionKindSchema = z.enum(sessionKinds);
export type SessionKind = z.infer<typeof sessionKindSchema>;

export const textDensitySchema = z.number().int().min(1).max(3);

export const exerciseKinds = ["mcq", "short_answer", "cloze", "transform"] as const;
export const exerciseKindSchema = z.enum(exerciseKinds);
export type ExerciseKind = z.infer<typeof exerciseKindSchema>;

/** Answer key of an item: the id of the right option (`mcq`) or every accepted written form. */
export const itemKeySchema = z.strictObject({
  answer: z.string().nullable(),
  accept: z.array(z.string()).max(50),
});
export type ItemKey = z.infer<typeof itemKeySchema>;

export const packetStepSchema = z.strictObject({
  step: sessionStepSchema,
  /** Minutes budgeted (`j2-seance-contenu.md` §1.1). */
  minutes: z.number().positive(),
  /** Required for the session to be complete. */
  required: z.boolean(),
});

export const packetTextSchema = z.strictObject({
  id: z.uuid(),
  language: languageCodeSchema,
  levelBand: cefrLevelSchema,
  density: textDensitySchema,
  theme: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1).max(8000),
  wordCount: z.number().int().positive(),
  newWords: z.array(jsonObjectSchema).max(8),
  grammarPoint: z.string().nullable(),
  /** First and last sentence (0-based, included) of the listening segment. */
  listeningSegment: z.strictObject({ from: z.number().int().min(0), to: z.number().int().min(0) }).nullable(),
  writingTask: z.string().min(1),
  generationReviewed: z.boolean().optional(),
});

export const packetItemSchema = z.strictObject({
  id: z.uuid(),
  textId: z.uuid().nullable(),
  step: z.enum(["reading", "workshop", "wake"]),
  kind: exerciseKindSchema,
  position: z.number().int().min(0),
  prompt: jsonObjectSchema,
  listeningOnly: z.boolean(),
  key: itemKeySchema,
});

export const packetCardSchema = z.strictObject({
  id: z.uuid(),
  kind: cardKindSchema,
  state: cardStateSchema,
  dueAt: isoInstantSchema,
  mode: z.enum(["recognition", "production", "listening"]),
  front: z.string().min(1),
  back: z.string().nullable(),
  context: z.string().nullable(),
  correctionHighlight: z.string().optional(),
  /** Id of the right option, in `recognition` mode. */
  correctOptionId: z.string().nullable(),
  options: z.array(z.strictObject({ id: z.string(), text: z.string() })).max(4),
  accept: z.array(z.string()).max(50),
});

export const packetErrorOfTheDaySchema = z.strictObject({
  itemId: z.uuid(),
  correctionId: z.uuid(),
  sentence: z.string(),
  highlighted: z.string(),
  explanation: z.string(),
  explanationLanguage: languageCodeSchema.optional(),
  accept: z.array(z.string()).min(1).max(20),
});

export const quotaSchema = z.strictObject({ used: z.number().int().min(0), limit: z.number().int().min(0) });

export const sessionPacketSchema = z.strictObject({
  session: z.strictObject({
    id: z.uuid(),
    language: languageCodeSchema,
    day: dateKeySchema,
    format: sessionFormatSchema,
    kind: sessionKindSchema,
    status: z.enum(["planned", "started", "completed", "abandoned"]),
    servedAt: isoInstantSchema,
  }),
  steps: z.array(packetStepSchema).min(1).max(6),
  text: packetTextSchema.nullable(),
  items: z.array(packetItemSchema).max(60),
  cards: z.array(packetCardSchema).max(120),
  wakeCardIds: z.array(z.uuid()).max(120).optional(),
  momentumWords: z.number().int().positive().nullable().optional(),
  errorOfTheDay: packetErrorOfTheDaySchema.nullable(),
  quotas: z.strictObject({ writingFeedback: quotaSchema, rewriteCheck: quotaSchema }),
  serverDay: dateKeySchema,
  timeZone: z.string().min(1),
});
export type SessionPacket = z.infer<typeof sessionPacketSchema>;

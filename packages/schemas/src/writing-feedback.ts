import { z } from "zod";
import { languageCodeSchema } from "./common";
import { MAX_PRODUCTION_CHARS, MAX_REWRITE_CHARS } from "./events/client-events";
import { packetErrorOfTheDaySchema } from "./events/session-packet";

export const WRITING_FEEDBACK_LIMITS = {
  minChars: 20,
  maxChars: MAX_PRODUCTION_CHARS,
  corrections: 8,
  comment: 300,
  passage: 400,
  nativeVersion: 5200,
} as const;

const L = WRITING_FEEDBACK_LIMITS;
export const WRITING_CRITERIA = ["grammar", "vocabulary", "register", "coherence"] as const;
export const CORRECTION_CATEGORIES = [
  "verb", "agreement", "function_word", "word_order", "word_choice", "l1_transfer", "spelling", "register", "other",
] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const criterionSchema = z.strictObject({ score: z.number().int().min(1).max(5), comment: text(L.comment) });

const writingCorrectionSchema = z.strictObject({
  original: text(L.passage),
  corrected: text(L.passage),
  explanation: text(L.comment),
  category: z.enum(CORRECTION_CATEGORIES),
});

export const writingFeedbackSchema = z.strictObject({
  scores: z.strictObject({
    grammar: criterionSchema, vocabulary: criterionSchema, register: criterionSchema, coherence: criterionSchema,
  }),
  corrections: z.array(writingCorrectionSchema).max(L.corrections),
  strength: text(L.comment),
  nativeVersion: text(L.nativeVersion),
});

export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

export const writingFeedbackSentenceSchema = z.strictObject({
  text: text(MAX_REWRITE_CHARS),
  nativeText: text(MAX_REWRITE_CHARS).nullable(),
  errors: z.array(writingCorrectionSchema.extend({ id: z.string().min(1).max(30) })).min(1).max(L.corrections),
});

export const storedWritingFeedbackSchema = z.strictObject({
  feedback: writingFeedbackSchema,
  // null means the model could not identify a predominant language. It is ineligible for XP.
  detectedLanguage: languageCodeSchema.nullable(),
  sentences: z.array(writingFeedbackSentenceSchema).max(2),
});

export type StoredWritingFeedback = z.infer<typeof storedWritingFeedbackSchema>;

export const writingFeedbackResponseSchema = z.discriminatedUnion("status", [
  storedWritingFeedbackSchema.omit({ detectedLanguage: true }).extend({
    status: z.literal("ready"),
    correctionId: z.uuid(),
    explanationLanguage: languageCodeSchema,
    errorOfTheDay: packetErrorOfTheDaySchema.nullable().optional(),
  }),
  z.strictObject({ status: z.enum([
    "pending", "not_found", "limit", "unavailable", "disabled", "invalid_production", "failed",
    "unauthenticated", "forbidden",
  ]) }),
]);

export type WritingFeedbackResponse = z.infer<typeof writingFeedbackResponseSchema>;

// Plain structured-output types. Enforce semantic and length constraints on the persisted result.
const scoreOutput = z.strictObject({
  score: z.number().int().describe("An integer from 1 to 5."),
  comment: z.string().describe("One short comment in the learner's first language."),
});
export const writingFeedbackOutputSchema = z.strictObject({
  grammar: scoreOutput, vocabulary: scoreOutput, register: scoreOutput, coherence: scoreOutput,
  corrections: z.array(z.strictObject({
    original: z.string().describe("An exact quotation from the original production."),
    corrected: z.string().describe("The same passage, corrected, in the studied language."),
    explanation: z.string().describe("Short explanation in the learner's first language."),
    category: z.enum(CORRECTION_CATEGORIES),
  })),
  strength: z.string().describe("One strength in the learner's first language."),
  nativeVersion: z.string().describe("The whole text as a native speaker would write it."),
  detectedLanguage: z.string().describe("Predominant language of the submission, an ISO 639 code, or 'und' for undetermined."),
});

export type WritingFeedbackOutput = z.infer<typeof writingFeedbackOutputSchema>;

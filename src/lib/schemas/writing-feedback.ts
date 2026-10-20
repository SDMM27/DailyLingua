import { z } from "zod";

/**
 * Feedback on a written production: a fixed grid of four criteria scored 1 to 5, a few
 * corrections and one strength. Written by the language model after the learner finishes the
 * writing task, validated here, then stored with the session (service role only) and shown on the
 * mission and in the history.
 */

export const WRITING_FEEDBACK_LIMITS = {
  /** Non-blank characters needed before asking for a review (characters, not words: CJK). */
  minChars: 20,
  /** Longest text sent to the model: also the input limit of the textarea (cost control). */
  maxChars: 2500,
  /** Reviews a learner can ask for on one session (failed calls count). */
  attemptsPerSession: 3,
  corrections: { max: 8 },
  score: { min: 1, max: 5 },
  /** Characters of a comment, an explanation or the strength. */
  comment: 300,
  /** Characters of an original or corrected passage. */
  passage: 400,
  /** Characters of the native version (the whole text rewritten; the text itself is capped at `maxChars`). */
  nativeVersion: 3500,
} as const;

const L = WRITING_FEEDBACK_LIMITS;

export const WRITING_CRITERIA = ["grammar", "vocabulary", "register", "coherence"] as const;
export type WritingCriterion = (typeof WRITING_CRITERIA)[number];

export const WRITING_CRITERION_LABELS: Record<WritingCriterion, string> = {
  grammar: "Grammaire",
  vocabulary: "Lexique",
  register: "Registre",
  coherence: "Cohérence",
};

export const CORRECTION_CATEGORIES = [
  "verb",
  "agreement",
  "function_word",
  "word_order",
  "word_choice",
  "spelling",
  "register",
  "other",
] as const;
export type CorrectionCategory = (typeof CORRECTION_CATEGORIES)[number];

export const CORRECTION_CATEGORY_LABELS: Record<CorrectionCategory, string> = {
  verb: "Verbes",
  agreement: "Accords",
  function_word: "Mots outils",
  word_order: "Ordre des mots",
  word_choice: "Choix des mots",
  spelling: "Orthographe",
  register: "Registre",
  other: "Autre",
};

// Stored and displayed shape ---------------------------------------------------------------------

const text = (max: number) => z.string().trim().min(1).max(max);

export const criterionScoreSchema = z.object({
  score: z.number().int().min(L.score.min).max(L.score.max),
  /** In French, one short sentence. */
  comment: text(L.comment),
});
export type CriterionScore = z.infer<typeof criterionScoreSchema>;

export const writingCorrectionSchema = z.object({
  /** Passage of the learner's text, as written. */
  original: text(L.passage),
  /** Same passage, corrected (studied language). */
  corrected: text(L.passage),
  /** In French. */
  explanation: text(L.comment),
  /** Optional: corrections stored before categories existed have none. */
  category: z.enum(CORRECTION_CATEGORIES).optional(),
});
export type WritingCorrection = z.infer<typeof writingCorrectionSchema>;

export const writingFeedbackSchema = z.object({
  scores: z.object({
    grammar: criterionScoreSchema,
    vocabulary: criterionScoreSchema,
    register: criterionScoreSchema,
    coherence: criterionScoreSchema,
  }),
  corrections: z.array(writingCorrectionSchema).max(L.corrections.max),
  /** In French: what the learner did well. */
  strength: text(L.comment),
  /** The whole text as a native would write it (studied language). Optional: older reviews have none. */
  nativeVersion: text(L.nativeVersion).optional(),
});
export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

/** Where a session stands: the last review (if any), the text it was about, attempts left. */
export const writingReviewStateSchema = z.object({
  feedback: writingFeedbackSchema.nullable(),
  /** Text the feedback is about; the draft may have changed since. */
  reviewedText: z.string().nullable(),
  attemptsLeft: z.number().int().min(0).max(L.attemptsPerSession),
});
export type WritingReviewState = z.infer<typeof writingReviewStateSchema>;

// Wire format: what the model returns ------------------------------------------------------------
//
// Plain types only (no bounds) so it converts to the JSON schema of structured outputs; the
// bounds are enforced afterwards by `writingFeedbackSchema` (see `validateWritingFeedback`).

const FRENCH = "In French (the learner's language), addressing the learner with « tu ».";
const STUDIED = "In the studied language.";

const wireCriterionSchema = z.object({
  score: z.number().int().describe("Integer from 1 (very weak) to 5 (excellent), for the learner's level."),
  comment_fr: z.string().describe(`${FRENCH} One short sentence justifying the score.`),
});

export const wireWritingFeedbackSchema = z.object({
  grammar: wireCriterionSchema,
  vocabulary: wireCriterionSchema,
  register: wireCriterionSchema,
  coherence: wireCriterionSchema,
  corrections: z.array(
    z.object({
      original: z.string().describe(`${STUDIED} Passage copied exactly from the learner's text.`),
      corrected: z.string().describe(`${STUDIED} The same passage, corrected.`),
      explanation_fr: z.string().describe(`${FRENCH} Short reason for the correction.`),
      category: z
        .enum(CORRECTION_CATEGORIES)
        .describe(
          "Kind of error: verb (conjugation, tense, mood, aspect), agreement (gender, number, case), function_word (articles, prepositions, particles), word_order, word_choice (vocabulary, collocations, calques from French), spelling (spelling, accents, punctuation, script), register, other.",
        ),
    }),
  ),
  strength_fr: z.string().describe(`${FRENCH} One thing the learner did well, precisely.`),
  native_version: z
    .string()
    .describe(`${STUDIED} The whole learner's text rewritten as a native would write it, keeping the learner's ideas.`),
});
export type WireWritingFeedback = z.infer<typeof wireWritingFeedbackSchema>;

// Request ----------------------------------------------------------------------------------------

/** Non-blank characters of a text (what `minChars` counts). */
export function meaningfulLength(value: string): number {
  return value.replace(/\s/gu, "").length;
}

/** Input of the server action (validated again on the server). */
export const requestWritingFeedbackInputSchema = z.object({
  sessionId: z.string().min(1),
  body: z
    .string()
    .max(L.maxChars, `Ton texte est trop long pour une correction (${L.maxChars} caractères maximum).`)
    .refine((value) => meaningfulLength(value) >= L.minChars, "Écris un peu plus avant de demander une correction."),
});

/** What the learner gets back. `unavailable`: the model failed or timed out (the task stays done). */
export type WritingFeedbackResult =
  | { status: "ready"; feedback: WritingFeedback; reviewedText: string; attemptsLeft: number }
  | { status: "unavailable"; attemptsLeft: number }
  | { status: "limit" };

import { z } from "zod";
import { cefrLevelSchema, dateKeySchema, languageSchema } from "./common";
import { reviewStateSchema } from "./vocabulary";
import { CORRECTION_CATEGORIES } from "./writing-feedback";

/**
 * Grammar points: curated lessons, one course file per language in `src/lib/grammar/courses/`
 * (authoring rules: `src/lib/grammar/AUTHORING.md`). A point practised successfully becomes a
 * spaced-repetition card (`grammar_cards`), scheduled like the correction cards.
 */

/** Marks the gap of `choose` and `fill` prompts. */
export const GRAMMAR_GAP = "___";

export const GRAMMAR_LIMITS = {
  rule: { min: 1, max: 6 },
  examples: { min: 2, max: 4 },
  exercises: { min: 3, max: 5 },
  options: { min: 3, max: 4 },
} as const;

const text = (max: number) => z.string().trim().min(1).max(max);
/** French text shown to the learner (may quote the studied language). */
const explanation = text(300);

/** Pick the right form among 3 or 4. */
const chooseExerciseSchema = z
  .object({
    type: z.literal("choose"),
    prompt: text(200),
    options: z.array(text(80)).min(GRAMMAR_LIMITS.options.min).max(GRAMMAR_LIMITS.options.max),
    answer: z.number().int().min(0),
    explanation,
  })
  .refine((e) => e.answer < e.options.length, { message: "answer is not an option index", path: ["answer"] });

/** Type the missing form; `hint` (e.g. the infinitive) is shown after the gap. */
const fillExerciseSchema = z.object({
  type: z.literal("fill"),
  prompt: text(200),
  hint: text(60).optional(),
  /** Every accepted answer (the first is the one shown as the correction). */
  answers: z.array(text(80)).min(1),
  explanation,
});

/** Rewrite `source` as `instruction` (French) says. */
const transformExerciseSchema = z.object({
  type: z.literal("transform"),
  instruction: text(160),
  source: text(200),
  answers: z.array(text(200)).min(1),
  explanation,
});

export const grammarExerciseSchema = z.union([chooseExerciseSchema, fillExerciseSchema, transformExerciseSchema]);
export type GrammarExercise = z.infer<typeof grammarExerciseSchema>;

export const grammarExampleSchema = z.object({
  /** In the studied language. */
  text: text(200),
  /** French. */
  translation: text(200),
  /** French, what to notice. */
  note: text(160).optional(),
});
export type GrammarExample = z.infer<typeof grammarExampleSchema>;

export const grammarTableSchema = z
  .object({
    caption: text(80).optional(),
    headers: z.array(text(40)).min(2).max(5),
    rows: z.array(z.array(text(60))).min(1).max(12),
  })
  .refine((t) => t.rows.every((row) => row.length === t.headers.length), {
    message: "every row must have one cell per header",
    path: ["rows"],
  });
export type GrammarTable = z.infer<typeof grammarTableSchema>;

/** Stable id `<lang>-<level>-<slug>`, e.g. `ru-a2-genitive`. Never reuse or rename one: cards point to it. */
export const grammarPointIdSchema = z.string().regex(/^[a-z]{2,3}-(a1|a2|b1|b2|c1|c2)-[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const grammarPointSchema = z.object({
  id: grammarPointIdSchema,
  level: cefrLevelSchema,
  /** French, short. */
  title: text(80),
  /** French, one line shown in the list. */
  summary: text(160),
  /** French paragraphs, 5 to 10 lines in all. */
  rule: z.array(text(400)).min(GRAMMAR_LIMITS.rule.min).max(GRAMMAR_LIMITS.rule.max),
  table: grammarTableSchema.optional(),
  examples: z.array(grammarExampleSchema).min(GRAMMAR_LIMITS.examples.min).max(GRAMMAR_LIMITS.examples.max),
  exercises: z.array(grammarExerciseSchema).min(GRAMMAR_LIMITS.exercises.min).max(GRAMMAR_LIMITS.exercises.max),
  /** Correction categories this point helps with (used to suggest it after repeated errors). */
  categories: z.array(z.enum(CORRECTION_CATEGORIES)).min(1),
  /** Day a native speaker approved the point; null = draft, hidden in production. */
  reviewedOn: dateKeySchema.nullable(),
});
export type GrammarPoint = z.infer<typeof grammarPointSchema>;

export const grammarCourseSchema = z.object({
  language: languageSchema,
  /** Date of the last change to the points (`YYYY-MM-DD`). */
  version: dateKeySchema,
  /** In teaching order. */
  points: z.array(grammarPointSchema),
});
export type GrammarCourse = z.infer<typeof grammarCourseSchema>;

/** A grammar point practised successfully, kept as a review card. */
export const grammarCardSchema = z.object({
  id: z.string().min(1),
  pointId: grammarPointIdSchema,
  language: languageSchema,
  status: z.enum(["learning", "known"]),
  review: reviewStateSchema,
  addedOn: dateKeySchema,
});
export type GrammarCard = z.infer<typeof grammarCardSchema>;

/** Where a point stands for the learner. */
export const GRAMMAR_POINT_STATES = ["new", "practised", "mastered"] as const;
export type GrammarPointState = (typeof GRAMMAR_POINT_STATES)[number];

/** Result of one run through the exercises of a point, sent by the client. */
export const recordGrammarPracticeInputSchema = z
  .object({
    pointId: grammarPointIdSchema,
    correct: z.number().int().min(0).max(GRAMMAR_LIMITS.exercises.max),
    total: z.number().int().min(1).max(GRAMMAR_LIMITS.exercises.max),
    /** Review count of the card the user saw; null when they had no card. Refused if it changed since. */
    expectedReviewCount: z.number().int().nonnegative().nullable(),
  })
  .refine((i) => i.correct <= i.total, { message: "correct > total", path: ["correct"] });
export type RecordGrammarPracticeInput = z.infer<typeof recordGrammarPracticeInputSchema>;

export const grammarCardIdInputSchema = z.object({ id: z.string().min(1) });

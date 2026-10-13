import { z } from "zod";
import { cefrLevelSchema, contentTypeSchema, dateKeySchema, languageSchema } from "./common";

export const contentSourceSchema = z.object({
  name: z.string().min(1),
  homepage: z.url(),
});

export const contentSchema = z.object({
  title: z.string().min(1),
  type: contentTypeSchema,
  language: languageSchema,
  source: contentSourceSchema,
  url: z.url(),
  difficulty: cefrLevelSchema,
  durationMinutes: z.number().int().positive(),
  summary: z.string().min(1),
  /**
   * Whether a transcript or full text was actually available to build the exercises.
   * When false, exercises are based only on public metadata (title, description).
   */
  transcriptAvailable: z.boolean(),
});
export type Content = z.infer<typeof contentSchema>;

export const ACTIVITY_KINDS = [
  "reading",
  "listening",
  "watching",
  "comprehension",
  "vocabulary",
  "writing",
  "speaking",
] as const;
export const activityKindSchema = z.enum(ACTIVITY_KINDS);
export type ActivityKind = z.infer<typeof activityKindSchema>;

export const activitySchema = z.object({
  id: z.string().min(1),
  kind: activityKindSchema,
  title: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
});
export type Activity = z.infer<typeof activitySchema>;

export const comprehensionQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(5),
    answerIndex: z.number().int().nonnegative(),
    explanation: z.string().min(1),
  })
  .refine((q) => q.answerIndex < q.options.length, {
    message: "answerIndex must point to an existing option",
    path: ["answerIndex"],
  });
export type ComprehensionQuestion = z.infer<typeof comprehensionQuestionSchema>;

export const expressionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  translation: z.string().min(1),
  example: z.string().min(1),
  note: z.string().optional(),
});
export type Expression = z.infer<typeof expressionSchema>;

export const productionTaskSchema = z.object({
  mode: z.enum(["writing", "speaking"]),
  prompt: z.string().min(1),
  hints: z.array(z.string().min(1)),
  targetLength: z.string().optional(),
});
export type ProductionTask = z.infer<typeof productionTaskSchema>;

export const languageSessionSchema = z.object({
  /** Identifies the session when saving progress (quiz answers, saved expressions). */
  id: z.string().min(1),
  language: languageSchema,
  content: contentSchema,
  activities: z.array(activitySchema).min(1),
  questions: z.array(comprehensionQuestionSchema),
  expressions: z.array(expressionSchema),
  production: productionTaskSchema,
});
export type LanguageSession = z.infer<typeof languageSessionSchema>;

export const EXERCISE_SOURCES = ["ai", "template"] as const;
/** "ai": written by the language model. "template": the deterministic fallback (no model). */
export const exerciseSourceSchema = z.enum(EXERCISE_SOURCES);
export type ExerciseSource = z.infer<typeof exerciseSourceSchema>;

export const missionSchema = z.object({
  id: z.string().min(1),
  date: dateKeySchema,
  budgetMinutes: z.number().int().positive(),
  sessions: z.array(languageSessionSchema).min(1),
  /** How the exercises were written; absent for hand-made missions (demo, seed). */
  exerciseSource: exerciseSourceSchema.optional(),
});
export type Mission = z.infer<typeof missionSchema>;

export const missionHistoryEntrySchema = z.object({
  id: z.string().min(1),
  date: dateKeySchema,
  budgetMinutes: z.number().int().positive(),
  completedMinutes: z.number().int().nonnegative(),
  sessions: z.array(
    z.object({
      language: languageSchema,
      title: z.string().min(1),
      sourceName: z.string().min(1),
      url: z.url(),
      type: contentTypeSchema,
      /** What the user wrote for the written production, if anything. */
      writing: z.string().optional(),
      /** Correct answers / total questions, null if the quiz was skipped. */
      score: z
        .object({ correct: z.number().int().nonnegative(), total: z.number().int().positive() })
        .nullable(),
    }),
  ),
});
export type MissionHistoryEntry = z.infer<typeof missionHistoryEntrySchema>;

/** What the user already did on a mission: ticked activities, quiz answers, saved expressions. */
export const missionProgressSchema = z.object({
  completedActivityIds: z.array(z.string()),
  /** Chosen option index, by session id then question id. */
  answers: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  savedExpressionIds: z.array(z.string()),
  /** Text written for the production task, by session id. */
  drafts: z.record(z.string(), z.string()),
});
export type MissionProgress = z.infer<typeof missionProgressSchema>;

export const EMPTY_MISSION_PROGRESS: MissionProgress = {
  completedActivityIds: [],
  answers: {},
  savedExpressionIds: [],
  drafts: {},
};

/** Inputs of the mission server actions (validated again on the server). */
export const setActivityDoneInputSchema = z.object({ activityId: z.string().min(1), done: z.boolean() });
export const answerQuestionInputSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  selectedIndex: z.number().int().nonnegative(),
});
export const MAX_PRODUCTION_LENGTH = 10_000;
export const saveProductionInputSchema = z.object({
  sessionId: z.string().min(1),
  body: z.string().max(MAX_PRODUCTION_LENGTH, "Le texte est trop long"),
});
export const saveExpressionInputSchema = z.object({
  sessionId: z.string().min(1),
  expressionId: z.string().min(1),
});

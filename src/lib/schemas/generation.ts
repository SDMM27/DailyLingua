import { z } from "zod";
import { cefrLevelSchema, contentTypeSchema, dateKeySchema, languageSchema } from "./common";
import { languagePurposeSchema } from "./preferences";
import { ACTIVITY_KINDS, exerciseSourceSchema, type ExerciseSource } from "./mission";

/**
 * Mission generation (phase 5): what the generator is given and what it must return.
 *
 * The language model never chooses ids, positions, minutes or activities: the app does. It only
 * picks one of the candidate contents per language and writes the exercises, in the "wire" shape
 * below. Wire objects are then checked again (`validateGeneratedSession`) and mapped to the
 * mission schemas, which stay the single source of truth for what a mission is.
 */

/** Limits of the generated exercises, shared by the prompt, the wire schema and the checks. */
export const GENERATION_LIMITS = {
  questions: { min: 0, max: 3 },
  options: { min: 3, max: 4 },
  expressions: { min: 3, max: 6 },
  hints: { min: 2, max: 4 },
  /** Characters, generous: the UI wraps text, these only stop runaway output. */
  shortText: 200,
  longText: 600,
} as const;

/** A content the generator may build a session on: public metadata only, never the full text. */
export const candidateContentSchema = z.object({
  /** Database id; never sent to the model (it sees the candidate's index). */
  id: z.string().min(1),
  type: contentTypeSchema,
  title: z.string().min(1),
  /** Teaser published in the feed, in the content's language. The only text the model sees. */
  summary: z.string().min(1),
  sourceName: z.string().min(1),
  difficulty: cefrLevelSchema,
  durationMinutes: z.number().int().positive(),
  categories: z.array(z.string()),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  /** Catalogue key of the source, to look up its traits when ranking. Never sent to the model. */
  sourceKey: z.string().min(1).nullable().optional(),
  /** Frequent words of the teaser (A1–A2 only), set once the candidates are ranked; printed in the prompt. */
  frequentWords: z.array(z.string()).optional(),
});
export type CandidateContent = z.infer<typeof candidateContentSchema>;

/**
 * `spoken`: written first (so it can be corrected), then said aloud. `speaking` is the former
 * spoken-only task: still readable in stored missions, never generated any more.
 */
export const productionModeSchema = z.enum(["writing", "spoken", "speaking"]);
export type ProductionMode = z.infer<typeof productionModeSchema>;

/** The modes a new mission can ask for. */
export const generatedProductionModeSchema = z.enum(["writing", "spoken"]);
export type GeneratedProductionMode = z.infer<typeof generatedProductionModeSchema>;

/** What to generate for one language. */
export const sessionRequestSchema = z.object({
  language: languageSchema,
  level: cefrLevelSchema,
  targetLevel: cefrLevelSchema,
  /** Free text from the preferences, e.g. "oral, vocabulaire actif". Untrusted user input. */
  focus: z.string(),
  /** Why the learner studies this language: sets the register and the kind of exercises. */
  purpose: languagePurposeSchema,
  /** Interests chosen for this language (French labels); never mixed with another language's. */
  topics: z.array(z.string()),
  minutes: z.number().int().positive(),
  productionMode: generatedProductionModeSchema,
  /** Minutes planned for the production task (estimate: the final plan depends on the exercises). */
  productionMinutes: z.number().int().positive(),
  /** Best first; at least one. */
  candidates: z.array(candidateContentSchema).min(1),
});
export type SessionRequest = z.infer<typeof sessionRequestSchema>;

export const generationRequestSchema = z.object({
  date: dateKeySchema,
  sessions: z.array(sessionRequestSchema).min(1),
});
export type GenerationRequest = z.infer<typeof generationRequestSchema>;

// Wire format: what the language model returns ------------------------------------------------
//
// Kept to plain types (no refinements, no length bounds) so it converts to the JSON schema of the
// API's structured outputs; the bounds are enforced afterwards by `validateGeneratedSession`.

// Fields written in French end in `_fr` and say so in their description: both reach the model
// through the JSON schema, which keeps it from answering in the studied language.
const STUDIED = "In the studied language.";
const FRENCH = "In French (the learner's language), addressing the learner with « tu ».";

export const wireQuestionSchema = z.object({
  prompt: z.string().describe(STUDIED),
  options: z.array(z.string().describe(STUDIED)),
  answerIndex: z.number().int(),
  explanation_fr: z.string().describe(`${FRENCH} Why the answer is right, quoting the teaser.`),
});

export const wireExpressionSchema = z.object({
  text: z.string().describe(`${STUDIED} Dictionary form.`),
  translation_fr: z.string().describe(FRENCH),
  example: z.string().describe(`${STUDIED} A sentence written for the learner.`),
  note_fr: z.string().describe(`${FRENCH} Short usage note (aspect, register, government...), or an empty string.`),
});

export const wireProductionSchema = z.object({
  prompt: z.string().describe(STUDIED),
  hints_fr: z.array(z.string().describe(`${FRENCH} Short tip; connectors may be quoted in the studied language.`)),
});

export const wireSessionSchema = z.object({
  language: languageSchema,
  /** Index in the request's candidates of the content the exercises are about. */
  candidateIndex: z.number().int(),
  questions: z.array(wireQuestionSchema),
  expressions: z.array(wireExpressionSchema),
  production: wireProductionSchema,
});
export type WireSession = z.infer<typeof wireSessionSchema>;

export const wireMissionSchema = z.object({
  sessions: z.array(wireSessionSchema),
});
export type WireMission = z.infer<typeof wireMissionSchema>;

// What a generator returns ---------------------------------------------------------------------

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerationResult {
  source: ExerciseSource;
  /** Model id, or "template". */
  model: string;
  promptVersion: string | null;
  sessions: WireSession[];
  usage: GenerationUsage | null;
}

/** Writes the exercises of a mission. Implementations: Claude, and a deterministic template. */
export interface ExerciseGenerator {
  readonly name: string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

/** Trace stored in missions.generation_meta (service role only; read back for `exerciseSource`). */
export const generationMetaSchema = z.object({
  source: exerciseSourceSchema,
  model: z.string(),
  promptVersion: z.string().nullable(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  durationMs: z.number().int().nonnegative(),
  /** Why the template was used instead of the model, when it was. */
  fallbackReason: z.string().max(300).nullable(),
  /**
   * Share of the words of the title and teaser of each chosen content among the 1000 and the 2000
   * most frequent forms of its language (null when too short to measure). Absent on older missions.
   */
  coverage: z
    .array(
      z.object({
        language: languageSchema,
        contentId: z.string(),
        top1000: z.number().min(0).max(1).nullable(),
        top2000: z.number().min(0).max(1).nullable(),
      }),
    )
    .optional(),
});
export type GenerationMeta = z.infer<typeof generationMetaSchema>;

/** A generated session ready to be written: what `complete_mission_generation` receives. */
export const plannedActivitySchema = z.object({
  kind: z.enum(ACTIVITY_KINDS),
  title: z.string().min(1).max(200),
  estimatedMinutes: z.number().int().positive(),
});
export type PlannedActivity = z.infer<typeof plannedActivitySchema>;

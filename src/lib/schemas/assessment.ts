import { z } from "zod";
import { LISTENING_MAX_PLAYS } from "@/lib/domain/assessment";
import { cefrLevelSchema, dateKeySchema, languageSchema, type CefrLevel } from "./common";
import { topicSchema } from "./preferences";

/**
 * Skills assessment dossiers: one text read, one passage heard, one writing prompt, written once and
 * reviewed by native speakers (files in `src/lib/assessment/dossiers/<language>/`, authoring rules:
 * `src/lib/assessment/AUTHORING.md`).
 *
 * The listening script and the reference answers must never be sent to the browser before the end of
 * the test: a page passes the learner only the text, the prompts and, once recorded, the audio URL.
 */

/** Per CEFR level: word counts, target audio length and number of sentences expected in the writing task. */
export const ASSESSMENT_LIMITS: Record<
  CefrLevel,
  { text: { min: number; max: number }; script: { min: number; max: number }; seconds: number; sentences: number }
> = {
  A1: { text: { min: 60, max: 90 }, script: { min: 25, max: 45 }, seconds: 20, sentences: 3 },
  A2: { text: { min: 100, max: 140 }, script: { min: 30, max: 50 }, seconds: 20, sentences: 3 },
  B1: { text: { min: 160, max: 220 }, script: { min: 60, max: 90 }, seconds: 35, sentences: 4 },
  B2: { text: { min: 230, max: 300 }, script: { min: 100, max: 150 }, seconds: 50, sentences: 5 },
  C1: { text: { min: 300, max: 400 }, script: { min: 120, max: 175 }, seconds: 55, sentences: 6 },
  C2: { text: { min: 350, max: 450 }, script: { min: 140, max: 200 }, seconds: 60, sentences: 6 },
};

/** Open questions per test (reading, listening). */
export const ASSESSMENT_QUESTIONS = 3;

const text = (max: number) => z.string().trim().min(1).max(max);

/** An open question, in French; the learner answers in French or in the studied language. */
export const assessmentQuestionSchema = z.object({
  id: text(40),
  prompt: text(300),
  referenceAnswer: text(400),
  expectedPoints: z.array(text(200)).min(1).max(4),
});
export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;

/** A native speaker's recording; the rights agreement itself is kept outside the repository. */
export const assessmentAudioSchema = z.object({
  file: text(120),
  /** First name or pseudonym only. */
  speaker: text(60),
  licence: z.literal("granted-commercial"),
  recordedOn: dateKeySchema,
});
export type AssessmentAudio = z.infer<typeof assessmentAudioSchema>;

export const assessmentDossierSchema = z.object({
  /** `<language>-<level lower case>-<n>`, stable: results point to it. */
  id: text(40),
  language: languageSchema,
  level: cefrLevelSchema,
  topic: topicSchema,
  /** In the studied language. */
  title: text(120),
  reading: z.object({
    text: z.string().min(1).max(4000),
    questions: z.array(assessmentQuestionSchema).length(ASSESSMENT_QUESTIONS),
  }),
  listening: z.object({
    /** Exact text of the recording: the sequel of the reading text, understandable on its own. */
    script: z.string().min(1).max(3000),
    questions: z.array(assessmentQuestionSchema).length(ASSESSMENT_QUESTIONS),
  }),
  writing: z.object({
    /** In French, tied to the dossier; the sentence count comes from `ASSESSMENT_LIMITS`. */
    prompt: text(400),
  }),
  audio: assessmentAudioSchema.nullable(),
  /** Date a native speaker approved the texts; null = draft. */
  reviewedOn: dateKeySchema.nullable(),
});
export type AssessmentDossier = z.infer<typeof assessmentDossierSchema>;

/**
 * What a learner has answered so far; every part may be partial (the assessment is resumed later).
 * Question ids come from the dossier; `speaking` holds the self-assessment statements ticked or not.
 */
export const assessmentAnswersSchema = z.object({
  questions: z.record(z.string(), z.string().max(1500)).default({}),
  writing: z.string().max(2500).default(""),
  speaking: z.record(z.string(), z.boolean()).default({}),
});
export type AssessmentAnswers = z.infer<typeof assessmentAnswersSchema>;

export const ASSESSMENT_CONFIDENCES = ["low", "medium", "high"] as const;
export const assessmentConfidenceSchema = z.enum(ASSESSMENT_CONFIDENCES);
export type AssessmentConfidence = z.infer<typeof assessmentConfidenceSchema>;

export const assessmentSkillResultSchema = z.object({
  level: cefrLevelSchema,
  confidence: assessmentConfidenceSchema,
});
export type AssessmentSkillResult = z.infer<typeof assessmentSkillResultSchema>;

/** A graded skill: the learner may also be offered a harder dossier (never at C2). */
export const assessmentGradedSkillResultSchema = assessmentSkillResultSchema.extend({ offerHigher: z.boolean() });
export type AssessmentGradedSkillResult = z.infer<typeof assessmentGradedSkillResultSchema>;

export const ASSESSMENT_VERDICTS = ["correct", "partial", "wrong"] as const;
export const assessmentVerdictSchema = z.enum(ASSESSMENT_VERDICTS);

export const ASSESSMENT_WRITING_CRITERIA = ["grammar", "vocabulary", "syntax", "adequacy"] as const;
export type AssessmentWritingCriterion = (typeof ASSESSMENT_WRITING_CRITERIA)[number];

const writingScore = z.number().int().min(1).max(5);

/** What the grader said, kept for the results screen: one verdict per question, four scores for the text. */
export const assessmentReviewSchema = z.object({
  /** By question id; only the questions of the dossier. */
  questions: z.record(z.string(), z.object({ verdict: assessmentVerdictSchema, comment: text(300) })),
  writing: z
    .object({
      scores: z.object({ grammar: writingScore, vocabulary: writingScore, syntax: writingScore, adequacy: writingScore }),
      comment: text(300),
    })
    .nullable(),
});
export type AssessmentReview = z.infer<typeof assessmentReviewSchema>;

/** Per skill: a result, or null when the skill was not assessed (e.g. no recording published). */
export const assessmentResultsSchema = z.object({
  reading: assessmentGradedSkillResultSchema.nullable(),
  listening: assessmentGradedSkillResultSchema.nullable(),
  writing: assessmentGradedSkillResultSchema.nullable(),
  /** Self-declared by the learner, never graded. */
  speaking: assessmentSkillResultSchema.extend({ declared: z.literal(true) }).nullable(),
  review: assessmentReviewSchema,
});
export type AssessmentResults = z.infer<typeof assessmentResultsSchema>;

export const ASSESSMENT_STATUSES = ["in_progress", "graded"] as const;

/** An assessment as the app sees it (the grading bookkeeping stays on the server). */
export const assessmentSchema = z.object({
  id: z.string().min(1),
  language: languageSchema,
  dossierId: text(40),
  status: z.enum(ASSESSMENT_STATUSES),
  answers: assessmentAnswersSchema,
  listeningPlays: z.number().int().min(0).max(LISTENING_MAX_PLAYS),
  results: assessmentResultsSchema.nullable(),
  startedAt: z.string().min(1),
  gradedAt: z.string().min(1).nullable(),
});
export type Assessment = z.infer<typeof assessmentSchema>;

// Wire format: what the grader returns -----------------------------------------------------------
//
// Plain types only (no bounds) so it converts to the JSON schema of structured outputs; the bounds
// are enforced afterwards by `assessmentReviewSchema` (see `validateAssessmentGrading`).

const FRENCH = "In French, addressing the learner with « tu ». One sentence.";

export const wireAssessmentGradingSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().describe("The id of the question, copied exactly."),
      verdict: z
        .enum(ASSESSMENT_VERDICTS)
        .describe("correct: every essential expected point; partial: some of them; wrong: none, vague, generic or off topic."),
      comment_fr: z.string().describe(FRENCH),
    }),
  ),
  writing: z
    .object({
      grammar: z.number().int().describe("Integer from 1 to 5, for the dossier level."),
      vocabulary: z.number().int().describe("Integer from 1 to 5, for the dossier level."),
      syntax: z.number().int().describe("Integer from 1 to 5, for the dossier level."),
      adequacy: z.number().int().describe("Integer from 1 to 5: fit with the task and its length."),
      comment_fr: z.string().describe(FRENCH),
    })
    .nullable()
    .describe("null when no text was sent."),
});
export type WireAssessmentGrading = z.infer<typeof wireAssessmentGradingSchema>;

/** Input of the server action (validated again on the server). */
export const gradeAssessmentInputSchema = z.object({ assessmentId: z.string().min(1) });

/** What grading an assessment gives back to the app. */
export type AssessmentGradingResult =
  | { status: "ready"; results: AssessmentResults }
  /** The dossier is not available to grade (still a draft where drafts are hidden). */
  | { status: "unavailable-dossier" }
  /** Nothing to grade yet. */
  | { status: "empty" }
  | { status: "limit" }
  /** The model failed or timed out; the attempt is counted. */
  | { status: "unavailable"; attemptsLeft: number };

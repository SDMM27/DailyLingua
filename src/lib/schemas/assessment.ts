import { z } from "zod";
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

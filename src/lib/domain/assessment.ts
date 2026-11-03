import { CEFR_LEVELS, type CefrLevel, type DateKey } from "@/lib/schemas/common";
import { diffInDays } from "./dates";

/**
 * Number of words of a text in a language, by Unicode word segmentation (`Intl.Segmenter`), so that
 * it works for Cyrillic and apostrophes alike. Punctuation and spaces are not counted.
 */
export function countWords(text: string, language: string): number {
  const segmenter = new Intl.Segmenter(language, { granularity: "word" });
  let count = 0;
  for (const segment of segmenter.segment(text)) if (segment.isWordLike) count++;
  return count;
}

/** A learner may hear the listening passage this many times (replays are not free: it is a test). */
export const LISTENING_MAX_PLAYS = 3;

/** Whether one more listening may start, given the listenings already started. */
export function canStartListening(plays: number): boolean {
  return plays < LISTENING_MAX_PLAYS;
}

/** Grading attempts of one assessment (failed model calls included); the database enforces the same. */
export const ASSESSMENT_GRADING_ATTEMPTS = 3;

export type AnswerVerdict = "correct" | "partial" | "wrong";

const VERDICT_POINTS: Record<AnswerVerdict, number> = { correct: 1, partial: 0.5, wrong: 0 };

/** What the decision says about a skill: the level and how far to trust it. */
export interface SkillDecision {
  level: CefrLevel;
  confidence: "low" | "medium" | "high";
  /** The learner may be offered a second, harder dossier. */
  offerHigher: boolean;
}

/** The level just under `level`, never below A1. */
export function lowerLevel(level: CefrLevel): CefrLevel {
  return CEFR_LEVELS[Math.max(0, CEFR_LEVELS.indexOf(level) - 1)];
}

/** Same rule for every graded skill: a high mark confirms the dossier's level, a low one lowers it. */
function decide(dossierLevel: CefrLevel, high: boolean, low: boolean): SkillDecision {
  if (high) return { level: dossierLevel, confidence: "high", offerHigher: dossierLevel !== "C2" };
  if (low) return { level: lowerLevel(dossierLevel), confidence: "low", offerHigher: false };
  return { level: dossierLevel, confidence: "medium", offerHigher: false };
}

/** Understanding of a dossier from its 3 verdicts (correct 1, partial 0.5, wrong 0): ≥ 2.5 confirms, ≤ 1 lowers. */
export function decideComprehension(dossierLevel: CefrLevel, verdicts: AnswerVerdict[]): SkillDecision {
  const points = verdicts.reduce((sum, verdict) => sum + VERDICT_POINTS[verdict], 0);
  return decide(dossierLevel, points >= 2.5, points <= 1);
}

/** Writing of a dossier from the mean of its 4 criteria (1..5): ≥ 3.75 confirms, ≤ 2 lowers. */
export function decideWriting(dossierLevel: CefrLevel, scores: number[]): SkillDecision {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return decide(dossierLevel, mean >= 3.75, mean <= 2);
}

/**
 * Declared speaking level: the highest level such that every statement up to it is ticked (the
 * statements go from the easiest to the hardest); none ticked = A1. A missing answer counts as no.
 * Null when nothing was answered. Declared, so always low confidence.
 */
export function decideSpeaking(
  claims: { id: string; level: CefrLevel }[],
  answers: Record<string, boolean>,
): { level: CefrLevel; confidence: "low" } | null {
  if (Object.keys(answers).length === 0) return null;
  let level: CefrLevel = "A1";
  for (const claim of claims) {
    if (answers[claim.id] !== true) break;
    level = claim.level;
  }
  return { level, confidence: "low" };
}

/** Level of reception: the lowest of reading and listening that were assessed, or null. */
export function receptionLevel(results: {
  reading: { level: CefrLevel } | null;
  listening: { level: CefrLevel } | null;
}): CefrLevel | null {
  const levels = [results.reading, results.listening].flatMap((r) => (r ? [r.level] : []));
  if (levels.length === 0) return null;
  return levels.reduce((lowest, level) => (CEFR_LEVELS.indexOf(level) < CEFR_LEVELS.indexOf(lowest) ? level : lowest));
}

// Steps of the assessment screen ------------------------------------------------------------------

export const ASSESSMENT_STEPS = ["reading", "listening", "writing", "speaking"] as const;
export type AssessmentStep = (typeof ASSESSMENT_STEPS)[number];

/** What a step asks: the ids of its questions (reading, listening) or statements (speaking). */
export interface AssessmentStepDefinition {
  step: AssessmentStep;
  ids: string[];
}

/** The answers as far as the steps are concerned (a structural subset of `AssessmentAnswers`). */
export interface StepAnswers {
  questions: Record<string, string>;
  writing: string;
  speaking: Record<string, boolean>;
}

const isFilled = (value: string | undefined) => value !== undefined && value.trim() !== "";

/** Whether the learner did anything in a step, and whether they went through all of it. */
function stepProgress(
  { step, ids }: AssessmentStepDefinition,
  answers: StepAnswers,
  plays: number,
): { touched: boolean; complete: boolean } {
  switch (step) {
    case "reading":
    case "listening": {
      const answered = ids.filter((id) => isFilled(answers.questions[id])).length;
      const heard = step === "listening" && plays > 0;
      return { touched: answered > 0 || heard, complete: ids.length > 0 && answered === ids.length };
    }
    case "writing":
      return { touched: isFilled(answers.writing), complete: isFilled(answers.writing) };
    case "speaking": {
      const answered = ids.filter((id) => answers.speaking[id] !== undefined).length;
      return { touched: answered > 0, complete: ids.length > 0 && answered === ids.length };
    }
  }
}

/**
 * The step to resume: the one after the furthest step the learner went all the way through, or that
 * furthest step itself when it is unfinished; the first step when nothing was touched. A step left
 * empty on purpose does not bring the learner back to it. `steps` is in the order of the screen;
 * the last step is returned once it is done (the learner then only has to finish).
 */
export function firstOpenStep(steps: AssessmentStepDefinition[], answers: StepAnswers, plays: number): AssessmentStep {
  let furthest = -1;
  steps.forEach((definition, index) => {
    if (stepProgress(definition, answers, plays).touched) furthest = index;
  });
  if (furthest < 0) return steps[0].step;
  const done = stepProgress(steps[furthest], answers, plays).complete;
  return steps[Math.min(done ? furthest + 1 : furthest, steps.length - 1)].step;
}

// Invitations on the home screen ------------------------------------------------------------------

/** The assessment is proposed again this many days after the last graded one. */
export const ASSESSMENT_REDO_DAYS = 60;
/** A dismissed invitation comes back once, this many days later. */
export const INVITE_RETURN_DAYS = 14;
/** Dismissed this many times, the invitation never comes back. */
export const INVITE_MAX_DISMISSALS = 2;

export type AssessmentInviteKind = "first" | "redo";

/**
 * What the home screen proposes for a language: the first assessment once the placement test is
 * done, or a new one at least `ASSESSMENT_REDO_DAYS` days after the last graded one. Nothing when
 * no dossier can be offered.
 */
export function assessmentInvite(input: {
  hasCompletedPlacement: boolean;
  hasVisibleDossier: boolean;
  lastGradedOn: DateKey | null;
  today: DateKey;
}): AssessmentInviteKind | null {
  if (!input.hasVisibleDossier) return null;
  if (input.lastGradedOn === null) return input.hasCompletedPlacement ? "first" : null;
  return diffInDays(input.lastGradedOn, input.today) >= ASSESSMENT_REDO_DAYS ? "redo" : null;
}

/**
 * Whether a dismissable invitation shows: always when never dismissed; once dismissed, again after
 * `INVITE_RETURN_DAYS` days; dismissed `INVITE_MAX_DISMISSALS` times, never.
 */
export function inviteVisible(input: { dismissedOn: DateKey | null; dismissCount: number; today: DateKey }): boolean {
  const { dismissedOn, dismissCount, today } = input;
  if (dismissCount <= 0 || dismissedOn === null) return true;
  if (dismissCount >= INVITE_MAX_DISMISSALS) return false;
  return diffInDays(dismissedOn, today) >= INVITE_RETURN_DAYS;
}

/**
 * The levels of a second dossier to offer after a dossier of `level`: the one above when a skill
 * confirmed the dossier's level with room to go (`offerHigher`), never past C2. Empty or one level.
 */
export function levelsToOffer(
  level: CefrLevel,
  results: { reading: { offerHigher: boolean } | null; listening: { offerHigher: boolean } | null; writing: { offerHigher: boolean } | null },
): CefrLevel[] {
  const above = CEFR_LEVELS[CEFR_LEVELS.indexOf(level) + 1];
  if (!above) return [];
  const offered = [results.reading, results.listening, results.writing].some((r) => r?.offerHigher === true);
  return offered ? [above] : [];
}

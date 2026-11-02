import { CEFR_LEVELS, type CefrLevel } from "@/lib/schemas/common";

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

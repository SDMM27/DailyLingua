import { FLUENCY_MIN_MS, MAX_READING_WPM, MIN_COMPREHENSION_ANSWERS, minReadingMs, passWpm } from "./rules";

/**
 * Proofs of the steps (`j2-jeu-xp-serie.md` §1, "Preuve d'étape"). Each step keeps an evidence object that grows
 * with the events of every batch (it is stored in `session_step.proof`); a step is validated when the evidence
 * is enough. The client never says a step is done.
 */

export interface WakeEvidence {
  /** Cards that received an attempt. */
  answered: string[];
  /** Sum of `answeredAt - shownAt` (ms). */
  ms: number;
}

/** Share of the time budget that validates the Réveil by itself. */
export const WAKE_BUDGET_SHARE = 0.9;

/** Réveil: every planned card was tried, or 90 % of the time budget was spent, or no card was due. */
export function wakeValidated(planned: readonly string[], budgetMinutes: number, evidence: WakeEvidence): boolean {
  if (planned.length === 0) return true;
  if (planned.every((id) => evidence.answered.includes(id))) return true;
  return evidence.ms >= WAKE_BUDGET_SHARE * budgetMinutes * 60_000;
}

export interface ReadingEvidence {
  /** Highest milestone reached (0 to 1), and the instants (ms) of the first 0 and of the 100 % milestones. */
  maxRatio: number;
  startedMs: number | null;
  endedMs: number | null;
  /** First answer to each question: item id → right or not. */
  answers: Record<string, boolean>;
}

export function emptyReadingEvidence(): ReadingEvidence {
  return { maxRatio: 0, startedMs: null, endedMs: null, answers: {} };
}

/** Time between the 0 % and the 100 % milestones, or null when one is missing. */
export function readingDurationMs(evidence: ReadingEvidence): number | null {
  return evidence.startedMs === null || evidence.endedMs === null ? null : evidence.endedMs - evidence.startedMs;
}

/**
 * Reading: the end was reached, no faster than 400 words a minute, with at least 3 answers received. Whatever the
 * score: a score under 60 % validates the step without XP.
 */
export function readingValidated(words: number, evidence: ReadingEvidence): boolean {
  const duration = readingDurationMs(evidence);
  return evidence.maxRatio >= 1 && duration !== null && duration >= minReadingMs(words) && Object.keys(evidence.answers).length >= MIN_COMPREHENSION_ANSWERS;
}

/** Workshop: every item served received at least one attempt. */
export function workshopValidated(itemIds: readonly string[], attempted: readonly string[]): boolean {
  return itemIds.every((id) => attempted.includes(id));
}

export interface ExpressionEvidence {
  /** A production passed length, language and similarity. */
  accepted: boolean;
  /** The correction has been received. */
  correctionReceived: boolean;
  /** The correction was put off (quota, budget): the production alone validates. */
  correctionDeferred: boolean;
  /** The correction lists at least one error. */
  hasErrors: boolean;
  /** Rewrites accepted by the check. */
  verifiedRewrites: number;
}

/**
 * Expression: an accepted production and, when the correction reported errors, one verified rewrite. A correction
 * still waiting for the network holds the step back (the session counts once the rewrite is done); a correction put
 * off for quota validates on the production alone.
 */
export function expressionValidated(evidence: ExpressionEvidence): boolean {
  if (!evidence.accepted) return false;
  if (evidence.correctionDeferred) return true;
  if (!evidence.correctionReceived) return false;
  return !evidence.hasErrors || evidence.verifiedRewrites >= 1;
}

/** Momentum: a pass of 10 s or more and at most 400 words a minute (slower than the reference still validates). */
export function momentumValidated(pass: { durationMs: number; words: number }): boolean {
  return pass.durationMs >= FLUENCY_MIN_MS && passWpm(pass.words, pass.durationMs) <= MAX_READING_WPM;
}

/** The session is complete when every required step is validated. */
export function allStepsValidated(required: readonly string[], validated: readonly string[]): boolean {
  return required.every((step) => validated.includes(step));
}

/**
 * What a model call is for. Every call names one, and the registry below decides how it is treated:
 * whether it survives an exhausted budget, which daily quota it draws on, and how long its answer
 * may be. Quotas and the circuit breaker come from docs/refonte/g-budget.md §5.
 */
export interface PurposeSpec {
  /**
   * Keeps running when the monthly budget is spent: the learner is waiting in a session, or the
   * call costs almost nothing. Non-essential purposes (stock generation, on-demand texts, role
   * play) stop, and the app serves the existing stock.
   */
  essential: boolean;
  /** Daily quota the call draws on, per learner; null when it has none (shared generation). */
  quotaKind: string | null;
  /** Calls per learner and per day for `quotaKind`; null exactly when `quotaKind` is null. */
  dailyLimit: number | null;
  /** `max_tokens` of the request. With adaptive thinking it also covers the reasoning tokens. */
  maxOutputTokens: number;
}

export const AI_PURPOSES = {
  /** Correction of a written production: 3 a day (g-budget §5.2). */
  writing_feedback: { essential: true, quotaKind: "writing_feedback", dailyLimit: 3, maxOutputTokens: 8000 },
  /** Check of the rewrite that follows a correction: a retry is allowed, so twice the corrections. */
  rewrite_check: { essential: true, quotaKind: "rewrite_check", dailyLimit: 6, maxOutputTokens: 2000 },
  /**
   * Graded text. On demand from the library (a learner id is given) it is 2 a day; the nightly
   * stock is generated without a learner and has no quota.
   */
  graded_text: { essential: false, quotaKind: "graded_text", dailyLimit: 2, maxOutputTokens: 8000 },
  /** Segmentation, lemmas and glosses for one first language: shared stock, no quota. */
  gloss: { essential: false, quotaKind: null, dailyLimit: null, maxOutputTokens: 8000 },
  /** Translation of a curated content to one first language: shared stock, no quota. */
  translation: { essential: false, quotaKind: null, dailyLimit: null, maxOutputTokens: 6000 },
  /** Written role play: 1 a day (g-budget §5.2). */
  roleplay: { essential: false, quotaKind: "roleplay", dailyLimit: 1, maxOutputTokens: 3000 },
  /** Grading of the skills assessment: the learner is waiting, and it is rare. */
  assessment_grading: { essential: true, quotaKind: "assessment_grading", dailyLimit: 3, maxOutputTokens: 8000 },
} as const satisfies Record<string, PurposeSpec>;

export type AiPurpose = keyof typeof AI_PURPOSES;

export const AI_PURPOSE_NAMES = Object.keys(AI_PURPOSES) as AiPurpose[];

export function isAiPurpose(value: string): value is AiPurpose {
  return Object.hasOwn(AI_PURPOSES, value);
}

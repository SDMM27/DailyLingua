import type { ReviewMode, XpRuleId, XpVolet, XpZeroReason } from "@dailylingua/schemas";

/**
 * The `j2.1` XP scale (`j2-jeu-xp-serie.md` §1). One function per rule: each takes the proof that
 * `planIngest` assembled and says what the rule is worth BEFORE the caps (`caps.ts`) and the yields.
 * No rule reads a clock or a store; nothing here comes from the client except the raw proof facts.
 */

/** What a rule decided: an amount (0 with its reason for a right answer that earns nothing, `null` when no reason is owed). */
export interface RuleOutcome {
  rule: XpRuleId;
  amount: number;
  volet: XpVolet | null;
  zero: XpZeroReason | null;
}

/** Strand of each rule (`meta.volet`). */
export const RULE_VOLET: Record<XpRuleId, XpVolet | null> = {
  "review.recognition": "study",
  "review.production": "study",
  "review.listening": "study",
  "review.bonus.difficulty": "study",
  "review.bonus.reconquest": "study",
  "reading.understood": "input",
  "reading.understood_well": "input",
  "focus.first_try": "study",
  "focus.second_try": "study",
  "production.corrected": "output",
  "rewrite.sentence": "output",
  "rewrite.sentence_native": "output",
  "error_of_day.reworked": "study",
  "fluency.pass": "fluency",
  "session.complete": null,
};

/** XP of each rule before the caps. */
export const RULE_XP = {
  "review.recognition": 1,
  "review.production": 2,
  "review.listening": 2,
  "review.bonus.difficulty": 1,
  "review.bonus.reconquest": 1,
  "reading.understood": 15,
  "reading.understood_well": 20,
  "focus.first_try": 2,
  "focus.second_try": 1,
  "production.corrected": 15,
  "rewrite.sentence": 5,
  "rewrite.sentence_native": 3,
  "error_of_day.reworked": 3,
  "fluency.pass": 5,
  "session.complete": 10,
} as const satisfies Record<XpRuleId, number>;

const outcome = (rule: XpRuleId, amount: number, zero: XpZeroReason | null = null): RuleOutcome => ({
  rule,
  amount,
  volet: RULE_VOLET[rule],
  zero,
});

/** Minimum time between showing a card and answering it, by mode (ms): a choice 600, a typed answer or a dictation 1 000. */
export const MIN_ANSWER_MS: Record<ReviewMode, number> = { recognition: 600, production: 1000, listening: 1000 };

/** A card with a stability under this many days, or a leech, earns the difficulty bonus. */
export const DIFFICULTY_BONUS_STABILITY_DAYS = 3;
export const LEECH_LAPSES = 6;

export interface ReviewProof {
  /** The answer is right (key of the server; `almost` counts under the lenient tolerance). */
  correct: boolean;
  /** The card was due at `shownAt`, or new and within the day's limit of new cards. */
  due: boolean;
  /** Time between `shownAt` and `answeredAt` (ms), as the server clamps it. */
  elapsedMs: number;
  /** A success on this card was already counted today. */
  alreadyCountedToday: boolean;
  /** Times the audio was played (`listening` only). */
  audioPlays: number;
}

const reviewRuleOf: Record<ReviewMode, XpRuleId> = {
  recognition: "review.recognition",
  production: "review.production",
  listening: "review.listening",
};

/** Why a right review answer earns nothing, or null when it counts. Order: not due, already counted, no audio, too fast. */
export function reviewZeroReason(mode: ReviewMode, proof: ReviewProof): XpZeroReason | null {
  if (!proof.due) return "not_due";
  if (proof.alreadyCountedToday) return "already_counted_today";
  if (mode === "listening" && proof.audioPlays < 1) return "no_audio";
  if (proof.elapsedMs < MIN_ANSWER_MS[mode]) return "too_fast";
  return null;
}

/** `review.recognition` (1 XP): a choice compared with the key. */
export function reviewRecognition(proof: ReviewProof): RuleOutcome {
  return reviewOutcome("recognition", proof);
}

/** `review.production` (2 XP): the typed answer matches an accepted form. */
export function reviewProduction(proof: ReviewProof): RuleOutcome {
  return reviewOutcome("production", proof);
}

/** `review.listening` (2 XP): the instruction is audio only, played at least once. */
export function reviewListening(proof: ReviewProof): RuleOutcome {
  return reviewOutcome("listening", proof);
}

/** The outcome of a review in `mode`; a wrong answer is worth nothing and owes no reason. */
export function reviewOutcome(mode: ReviewMode, proof: ReviewProof): RuleOutcome {
  const rule = reviewRuleOf[mode];
  if (!proof.correct) return outcome(rule, 0);
  const zero = reviewZeroReason(mode, proof);
  return zero ? outcome(rule, 0, zero) : outcome(rule, RULE_XP[rule]);
}

/** `review.bonus.difficulty` (+1): a counted success on a card of stability under 3 days or on a leech. */
export function reviewBonusDifficulty(card: { stability: number | null; lapses: number }): RuleOutcome {
  const hard = (card.stability !== null && card.stability < DIFFICULTY_BONUS_STABILITY_DAYS) || card.lapses >= LEECH_LAPSES;
  return outcome("review.bonus.difficulty", hard ? RULE_XP["review.bonus.difficulty"] : 0);
}

/** `review.bonus.reconquest` (+1): a counted success on a card whose last rating of the day before was "again". */
export function reviewBonusReconquest(card: { lastRatingYesterday: number | null }): RuleOutcome {
  return outcome("review.bonus.reconquest", card.lastRatingYesterday === 1 ? RULE_XP["review.bonus.reconquest"] : 0);
}

/** A text longer than this many words pays 1.5 times. */
export const LONG_TEXT_WORDS = 600;
/** Reading speed ceiling that proves a text was read: `words * 60 000 / 400` ms at least. */
export const MAX_READING_WPM = 400;
export const READING_UNDERSTOOD_RATIO = 0.6;
export const READING_WELL_RATIO = 0.9;
/** Comprehension answers needed before the reading counts. */
export const MIN_COMPREHENSION_ANSWERS = 3;

/** Shortest time that reading `words` words can take (ms). */
export function minReadingMs(words: number): number {
  return Math.ceil((words * 60_000) / MAX_READING_WPM);
}

export interface ReadingProof {
  /** Right first answers over questions served (0 to 1). */
  score: number;
  words: number;
  /** `t(100 %) - t(0 %)` in ms. */
  readingMs: number;
  /** Comprehension answers received. */
  answers: number;
  /** First pass of the day on this text. */
  firstPassOfDay: boolean;
}

/**
 * `reading.understood` (15 XP, score 60-89 %) or `reading.understood_well` (20 XP, 90 % and over); × 1.5 rounded up
 * above 600 words. Below 60 % the step is valid but earns nothing. A pass that is too short in time earns 0 (`too_fast`),
 * a text read again the same day 0 (`reread`); fewer than 3 answers: nothing yet (the proof is not complete).
 */
export function readingUnderstood(proof: ReadingProof): RuleOutcome & { long: boolean } {
  const well = proof.score >= READING_WELL_RATIO;
  const rule: XpRuleId = well ? "reading.understood_well" : "reading.understood";
  const long = proof.words > LONG_TEXT_WORDS;
  const none = (zero: XpZeroReason | null = null) => ({ ...outcome(rule, 0, zero), long });
  if (proof.score < READING_UNDERSTOOD_RATIO || proof.answers < MIN_COMPREHENSION_ANSWERS) return none();
  if (!proof.firstPassOfDay) return none("reread");
  if (proof.readingMs < minReadingMs(proof.words)) return none("too_fast");
  const base = RULE_XP[rule];
  return { ...outcome(rule, long ? Math.ceil(base * 1.5) : base), long };
}

export interface FocusProof {
  /** Attempt number on the item (1 to 3). */
  attempt: number;
  correct: boolean;
  /** For the second attempt: the first one was wrong. */
  firstWrong: boolean;
  /** A first attempt on this item was already seen today. */
  alreadyPassedToday: boolean;
}

/** `focus.first_try` (2 XP): the first attempt is right, on the first pass of the day on the item. */
export function focusFirstTry(proof: FocusProof): RuleOutcome {
  if (proof.attempt !== 1 || !proof.correct) return outcome("focus.first_try", 0);
  return proof.alreadyPassedToday ? outcome("focus.first_try", 0, "already_counted_today") : outcome("focus.first_try", RULE_XP["focus.first_try"]);
}

/** `focus.second_try` (1 XP): right on the second attempt after a wrong first one; a third attempt is worth 0. */
export function focusSecondTry(proof: FocusProof): RuleOutcome {
  if (proof.attempt !== 2 || !proof.correct || !proof.firstWrong) return outcome("focus.second_try", 0);
  return proof.alreadyPassedToday ? outcome("focus.second_try", 0, "already_counted_today") : outcome("focus.second_try", RULE_XP["focus.second_try"]);
}

/** Minimum length of a production in words, by writing level (`j2-jeu-xp-serie.md` §1). */
export const PRODUCTION_MIN_WORDS = { A1: 20, A2: 35, B1: 60, B2: 90, C1: 120, C2: 120 } as const;
export const PRODUCTION_MAX_SIMILARITY = 0.5;

export interface ProductionProof {
  words: number;
  minWords: number;
  /** Language the correction detected, or null when it did not say. */
  detectedLanguage: string | null;
  targetLanguage: string;
  /** Highest similarity with the source text, the native versions given and the last 30 productions (0 to 1). */
  similarity: number;
}

/** Why a production is not accepted (length, language, similarity), or null when it is. Order: length, language, similarity. */
export function productionRejection(proof: ProductionProof): XpZeroReason | null {
  if (proof.words < proof.minWords) return "too_short";
  if (proof.detectedLanguage !== null && proof.detectedLanguage !== proof.targetLanguage) return "wrong_language";
  if (proof.similarity >= PRODUCTION_MAX_SIMILARITY) return "too_similar";
  return null;
}

/** `production.corrected` (15 XP): an accepted production whose correction was received. */
export function productionCorrected(proof: ProductionProof): RuleOutcome {
  const zero = productionRejection(proof);
  return zero ? outcome("production.corrected", 0, zero) : outcome("production.corrected", RULE_XP["production.corrected"]);
}

/** Minimum similarity of a rewrite with the sentence it rewrites (characters): it must not be another sentence. */
export const REWRITE_MIN_SIMILARITY = 0.5;

/** `rewrite.sentence` (5 XP) or `rewrite.sentence_native` (3 XP) when the sentence is the native version word for word. */
export function rewriteSentence(proof: { accepted: boolean; isNativeVersion: boolean }): RuleOutcome {
  const rule: XpRuleId = proof.isNativeVersion ? "rewrite.sentence_native" : "rewrite.sentence";
  return outcome(rule, proof.accepted ? RULE_XP[rule] : 0);
}

/** `error_of_day.reworked` (3 XP): a right attempt on an item the server made from an error not yet reworked. */
export function errorOfDayReworked(proof: { correct: boolean; alreadyReworked: boolean }): RuleOutcome {
  if (!proof.correct) return outcome("error_of_day.reworked", 0);
  return proof.alreadyReworked ? outcome("error_of_day.reworked", 0, "already_counted_today") : outcome("error_of_day.reworked", RULE_XP["error_of_day.reworked"]);
}

export const FLUENCY_MIN_MS = 10_000;
export const FLUENCY_MIN_REFERENCE_RATIO = 0.9;
/** Days after the reading of a text during which a fluency pass on it pays. */
export const FLUENCY_WINDOW_DAYS = 7;

export interface FluencyProof {
  /** `endedAt - startedAt` in ms. */
  durationMs: number;
  words: number;
  /** Reading of this text earned `reading.*` (60 % and over) within the last 7 days. */
  readingEarnedRecently: boolean;
  /** Reference speed, words per minute (previous pass, otherwise the first reading), or null. */
  referenceWpm: number | null;
}

/** Words per minute of a pass. */
export function passWpm(words: number, durationMs: number): number {
  return durationMs > 0 ? (words * 60_000) / durationMs : Number.POSITIVE_INFINITY;
}

/**
 * `fluency.pass` (5 XP): the text was already understood, the pass lasted 10 s or more, at most 400 words per
 * minute and at least 90 % of the reference speed. Slower than the reference: the step may be valid, 0 XP.
 */
export function fluencyPass(proof: FluencyProof): RuleOutcome {
  if (!proof.readingEarnedRecently) return outcome("fluency.pass", 0);
  if (proof.durationMs < FLUENCY_MIN_MS) return outcome("fluency.pass", 0, "too_fast");
  const wpm = passWpm(proof.words, proof.durationMs);
  if (wpm > MAX_READING_WPM) return outcome("fluency.pass", 0, "too_fast");
  if (proof.referenceWpm !== null && wpm < FLUENCY_MIN_REFERENCE_RATIO * proof.referenceWpm) return outcome("fluency.pass", 0);
  return outcome("fluency.pass", RULE_XP["fluency.pass"]);
}

/** `session.complete` (10 XP): once a day, for a `daily` session whose steps are all validated. */
export function sessionComplete(proof: { kind: "daily" | "catch_up" | "review_only"; allStepsValidated: boolean }): RuleOutcome {
  return outcome("session.complete", proof.kind === "daily" && proof.allStepsValidated ? RULE_XP["session.complete"] : 0);
}

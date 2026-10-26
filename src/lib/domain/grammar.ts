import type { CefrLevel, DateKey, Language } from "@/lib/schemas/common";
import type { GrammarCard, GrammarExercise, GrammarPointState } from "@/lib/schemas/grammar";
import type { ReviewGrade, ReviewState } from "@/lib/schemas/vocabulary";
import { languageInfo } from "./languages";
import { applyReview, initialReviewState, isDue } from "./spaced-repetition";
import { stripStress } from "./stress";

/** Share of right answers needed to keep a point as a review card. */
export const GRAMMAR_PASS_RATIO = 0.6;
/** From this Leitner box a point counts as mastered. */
export const GRAMMAR_MASTERED_BOX = 4;
/** Levels the pilot courses cover; a learner above them gets every point as a reference. */
export const GRAMMAR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1"];

/** Arabic harakat (fathatan to sukun, superscript alef) and tatweel. */
const ARABIC_VOWEL_MARKS = /[ً-ْٰـ]/g;

/**
 * Compares typed answers whatever the spacing, case (with the language's own rules: Turkish ı/İ),
 * final punctuation and typographic apostrophe; also, depending on the language, whatever the
 * stress mark and ё/е (Cyrillic), the spaces (Chinese, Japanese) or the short vowels (Arabic).
 */
export function normalizeGrammarAnswer(language: Language, text: string): string {
  const info = languageInfo(language);
  let value = normalizeTypedText(text.toLocaleLowerCase(language));
  if (info.markStress) value = stripStress(value).replaceAll("ё", "е").normalize("NFC");
  if (info.optionalVowelMarks) value = value.replace(ARABIC_VOWEL_MARKS, "");
  if (info.unspaced) value = value.replace(/\s/g, "");
  return value;
}

/** The language-independent part of `normalizeGrammarAnswer`: also used for answers in French. */
export function normalizeTypedText(text: string): string {
  return text
    .normalize("NFC")
    .replaceAll("’", "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    // Final punctuation, Greek question mark (;), CJK and Arabic marks included; Spanish ¿ ¡ in front.
    .replace(/(?:\s*[.!?…;。！？؟])+$/u, "")
    .replace(/^[¿¡]+\s*/u, "")
    .trim();
}

export function isExerciseAnswerCorrect(exercise: GrammarExercise, answer: string | number, language: Language): boolean {
  if (exercise.type === "choose") return answer === exercise.answer;
  if (typeof answer !== "string") return false;
  const given = normalizeGrammarAnswer(language, answer);
  return given !== "" && exercise.answers.some((a) => normalizeGrammarAnswer(language, a) === given);
}

/** The right answer as shown after a mistake. */
export function exerciseCorrection(exercise: GrammarExercise): string {
  return exercise.type === "choose" ? exercise.options[exercise.answer] : exercise.answers[0];
}

export function gradeFromScore(correct: number, total: number): ReviewGrade {
  if (total > 0 && correct >= total) return "good";
  if (total > 0 && correct / total >= GRAMMAR_PASS_RATIO) return "hard";
  return "again";
}

/** What the Leitner logic needs of a card: grammar points and alphabet groups share it. */
export interface PracticeCard {
  status: "learning" | "known";
  review: ReviewState;
}

export type GrammarPracticeOutcome = "created" | "reviewed" | "practice" | "not-passed";

export interface GrammarPracticePlan {
  outcome: GrammarPracticeOutcome;
  /** The state to store; absent when nothing is recorded. */
  review?: ReviewState;
}

/**
 * What a run through the exercises changes. A card is created by a pass (60 %), then only
 * reviewed when it is due; any other run is free practice and records nothing.
 */
export function planGrammarPractice(
  card: PracticeCard | undefined,
  correct: number,
  total: number,
  today: DateKey,
): GrammarPracticePlan {
  const grade = gradeFromScore(correct, total);
  if (!card) {
    if (total <= 0 || correct / total < GRAMMAR_PASS_RATIO) return { outcome: "not-passed" };
    return { outcome: "created", review: applyReview(initialReviewState(today), grade, today) };
  }
  if (card.status === "learning" && isDue(card.review, today)) {
    return { outcome: "reviewed", review: applyReview(card.review, grade, today) };
  }
  return { outcome: "practice" };
}

export function grammarPointState(card: PracticeCard | undefined): GrammarPointState {
  if (!card) return "new";
  if (card.status === "known" || card.review.box >= GRAMMAR_MASTERED_BOX) return "mastered";
  return "practised";
}

/** What the server answers once a run is recorded (or not). */
export interface GrammarPracticeResult {
  outcome: GrammarPracticeOutcome;
  /** The card after the run; null when the learner has none (not passed). */
  card: GrammarCard | null;
}

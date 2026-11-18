import type { ReviewMode, ReviewRating } from "@dailylingua/schemas";
import { diacriticFolds, ignoreCommasAndDashes, ignoreInnerPunctuation, normalizeAnswer } from "./normalize";

/** How typed answers are compared (`j2-seance-contenu.md` §2.2): `cloze` and `short_answer` ignore inner punctuation. */
export type TypedKind = "short_answer" | "cloze" | "transform";

/** `lenient` (default) counts a diacritics-only slip right; `strict` is the "strict accents" setting. */
export type AccentTolerance = "strict" | "lenient";

/**
 * - `correct`: the same after normalisation;
 * - `almost`: only diacritics differ (compté juste unless the tolerance is `strict`);
 * - `wrong`: anything else, a typo included.
 */
export type Verdict = "correct" | "almost" | "wrong";

export interface Graded {
  verdict: Verdict;
  /** Counts as a right answer: `correct`, or `almost` under the lenient tolerance. */
  correct: boolean;
  /** The accepted spelling to show: set when the verdict is `almost`, or `wrong` and one form was expected. */
  shown: string | null;
}

const WRONG: Graded = { verdict: "wrong", correct: false, shown: null };

/** The comparison form of one text for `language` and `kind`. */
function canonical(language: string, kind: TypedKind, text: string): string {
  const prepared = text.replaceAll("’", "'");
  const inner = kind === "transform" ? ignoreCommasAndDashes(prepared) : ignoreInnerPunctuation(prepared);
  return normalizeAnswer(language, inner);
}

/**
 * Grades a typed answer against every accepted form (`accept[]`). Pure: no clock, no I/O.
 * An empty answer is wrong; a diacritics-only difference is `almost` (the good spelling is returned).
 */
export function gradeTyped(params: {
  language: string;
  kind: TypedKind;
  answer: string;
  accept: readonly string[];
  tolerance?: AccentTolerance;
}): Graded {
  const { language, kind, answer, accept, tolerance = "lenient" } = params;
  const given = canonical(language, kind, answer);
  if (given === "") return WRONG;
  const forms = accept.map((form) => ({ form, key: canonical(language, kind, form) })).filter((entry) => entry.key !== "");
  const exact = forms.find((entry) => entry.key === given);
  if (exact) return { verdict: "correct", correct: true, shown: null };
  for (const fold of diacriticFolds(language)) {
    const near = forms.find((entry) => fold(entry.key) === fold(given));
    if (near) return { verdict: "almost", correct: tolerance === "lenient", shown: near.form };
  }
  return { ...WRONG, shown: accept[0] ?? null };
}

/** An exact choice: the answer is the id of the option, compared with the key. */
export function gradeChoice(answer: string, key: string | null): Graded {
  const correct = key !== null && answer === key;
  return { verdict: correct ? "correct" : "wrong", correct, shown: null };
}

/**
 * FSRS rating of a graded answer (`j2-seance-contenu.md` §2.1): right = Good (3), Easy (4) when answered in
 * less than 40 % of the learner's median time for the mode; almost (lenient) = Hard (2); wrong, and almost
 * under the strict tolerance = Again (1).
 */
export function ratingFor(graded: Graded, options: { elapsedMs: number; medianMs?: number | null }): ReviewRating {
  if (!graded.correct) return 1;
  if (graded.verdict === "almost") return 2;
  const { elapsedMs, medianMs } = options;
  return medianMs != null && medianMs > 0 && elapsedMs < 0.4 * medianMs ? 4 : 3;
}

/** What the server knows of a card to grade a review: the id of the right option, or the accepted forms. */
export interface CardKey {
  /** Id of the right option, for a choice. */
  optionId: string | null;
  accept: readonly string[];
}

/**
 * Grades the recall of a card: a choice when the key has an option id (`recognition`, and `listening`
 * with options), otherwise a typed answer (`production`, `listening`) compared with `accept[]`.
 */
export function gradeCardRecall(params: {
  language: string;
  mode: ReviewMode;
  answer: string;
  key: CardKey;
  tolerance?: AccentTolerance;
  /** `cloze` cards (a gap in the sentence of origin) ignore inner punctuation too; so do the others. */
  kind?: TypedKind;
}): Graded {
  const { language, mode, answer, key, tolerance, kind = "short_answer" } = params;
  if (key.optionId !== null || mode === "recognition") return gradeChoice(answer, key.optionId);
  return gradeTyped({ language, kind, answer, accept: key.accept, tolerance });
}

/** Where a card's stability puts it on the recall ladder. */
export interface CardRecallVariant {
  mode: ReviewMode;
  /** `recognize` (4 meanings to choose from), `translate` (L1 to L2 typed), `cloze` (gap in the sentence of origin). */
  variant: "recognize" | "translate" | "cloze";
}

/**
 * The recall mode of a card from its FSRS stability (`j2-seance-contenu.md` §2.2): under 3 days
 * `recognize`; 3 to 10 days `translate`; over 10 days `cloze` when the card has a sentence of context,
 * otherwise `translate`. A card without memory yet (null stability) is recognised.
 */
export function cardRecallVariant(card: { stability: number | null; hasContext: boolean }): CardRecallVariant {
  const { stability, hasContext } = card;
  if (stability === null || stability < 3) return { mode: "recognition", variant: "recognize" };
  if (stability > 10 && hasContext) return { mode: "production", variant: "cloze" };
  return { mode: "production", variant: "translate" };
}

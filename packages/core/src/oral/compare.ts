import { isTargetLanguage, languageInfo } from "../languages";
import { diacriticFolds, ignoreInnerPunctuation, normalizeAnswer } from "../grading/normalize";
import { NEAR_MATCH_MIN_LETTERS } from "./thresholds";

/** What happened to a word (or a character) of the comparison. */
export type OralStatus = "ok" | "missing" | "wrong" | "extra";

export interface OralToken {
  /** The model's word for `ok`, `missing` and `wrong`; the word of the transcript for `extra`. */
  text: string;
  status: OralStatus;
  /** An `ok` word the device heard one letter off (a near match): right for the XP, never for a perfect score. */
  near?: true;
}

export interface SpokenComparison {
  /** Share of right words, 0 to 1, two decimals; 1 only when every word is right and none is missing or extra. */
  ratio: number;
  tokens: OralToken[];
}

export interface DictationGrade {
  /** `1 - edit distance / length of the model`, 0 to 1. */
  accuracy: number;
  diff: OralToken[];
}

/** The comparison form of a sentence: inner punctuation gone (the apostrophe stays), then the language normalisation. */
function canonical(language: string, text: string): string {
  return normalizeAnswer(language, ignoreInnerPunctuation(text.replaceAll("’", "'")));
}

/** Words of a sentence, or its characters where words are not separated by spaces. */
function wordsOf(language: string, text: string): string[] {
  const value = canonical(language, text);
  if (value === "") return [];
  const unspaced = isTargetLanguage(language) && languageInfo(language).unspaced === true;
  return unspaced ? Array.from(value) : value.split(" ");
}

/** True when `a` and `b` differ by at most one inserted, deleted or replaced character. */
function withinOneEdit(a: readonly string[], b: readonly string[]): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  // Past the first difference: a replacement skips one character on both sides, a gap on the longer side only.
  const restA = a.slice(i + (a.length >= b.length ? 1 : 0));
  const restB = b.slice(i + (b.length >= a.length ? 1 : 0));
  return restA.length === restB.length && restA.every((char, index) => char === restB[index]);
}

/** Whether a spoken word counts as the model word. */
function sameWord(model: string, spoken: string): boolean {
  if (model === spoken) return true;
  const letters = Array.from(model);
  return letters.length >= NEAR_MATCH_MIN_LETTERS && withinOneEdit(letters, Array.from(spoken));
}

interface Aligned {
  op: OralStatus;
  model?: number;
  spoken?: number;
}

/**
 * Minimal-edit alignment of two sequences: a match costs 0, a substitution, a deletion and an insertion 1. On a tie
 * the match or substitution wins over a gap, then a deletion (`missing`) over an insertion (`extra`), so the result
 * is deterministic.
 */
function align<T>(model: readonly T[], spoken: readonly T[], same: (a: T, b: T) => boolean): Aligned[] {
  const rows = model.length + 1;
  const cols = spoken.length + 1;
  const cost: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  const at = (i: number, j: number): number => (cost[i] as number[])[j] as number;
  for (let i = 0; i < rows; i++) (cost[i] as number[])[0] = i;
  for (let j = 0; j < cols; j++) (cost[0] as number[])[j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const diagonal = at(i - 1, j - 1) + (same(model[i - 1] as T, spoken[j - 1] as T) ? 0 : 1);
      (cost[i] as number[])[j] = Math.min(diagonal, at(i - 1, j) + 1, at(i, j - 1) + 1);
    }
  }
  const path: Aligned[] = [];
  let i = model.length;
  let j = spoken.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const isSame = same(model[i - 1] as T, spoken[j - 1] as T);
      if (at(i, j) === at(i - 1, j - 1) + (isSame ? 0 : 1)) {
        path.push({ op: isSame ? "ok" : "wrong", model: i - 1, spoken: j - 1 });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && at(i, j) === at(i - 1, j) + 1) {
      path.push({ op: "missing", model: i - 1 });
      i--;
    } else {
      path.push({ op: "extra", spoken: j - 1 });
      j--;
    }
  }
  return path.reverse();
}

/**
 * Compares what the device heard with the model sentence, word by word (`j5-pr1-atelier-oral.md` §2). Pure. A word one
 * letter off (five letters or more) counts right but marks the token `near` and keeps the ratio under 1. The ratio is the right words over the longer of the two sentences, and
 * is never 1 for a sentence that is not exactly the model's words.
 */
export function compareSpoken(language: string, model: string, transcript: string): SpokenComparison {
  const expected = wordsOf(language, model);
  const heard = wordsOf(language, transcript);
  const tokens: OralToken[] = align(expected, heard, sameWord).map((step) => {
    const text = (step.op === "extra" ? heard[step.spoken as number] : expected[step.model as number]) as string;
    const near = step.op === "ok" && heard[step.spoken as number] !== text;
    return near ? { text, status: step.op, near: true } : { text, status: step.op };
  });
  const right = tokens.filter((token) => token.status === "ok").length;
  const longest = Math.max(expected.length, heard.length);
  if (longest === 0) return { ratio: 0, tokens };
  // A near match ("stanco" for "stanca") may be an agreement error: it counts, but the sentence is not perfect.
  if (right === longest && !tokens.some((token) => token.near)) return { ratio: 1, tokens };
  // Never a perfect score for a sentence that is not exactly right, whatever the rounding.
  return { ratio: Math.min(Math.round((right / longest) * 100) / 100, 0.99), tokens };
}

/** Private-use stand-ins that keep й and ї out of the diacritics fold (NFD would turn them into и and і). */
const PROTECTED: ReadonlyMap<string, string> = new Map([
  ["й", ""],
  ["ї", ""],
]);

/** The fold of the `lenient` tolerance for `language`: its most inclusive diacritics fold, the Cyrillic breve and diaeresis kept. */
function lenientFold(language: string): (char: string) => string {
  const folds = diacriticFolds(language);
  const fold = folds[folds.length - 1] as (text: string) => string;
  return (char) => PROTECTED.get(char) ?? fold(char);
}

/** A character of a dictation to align: what to show (empty for the tail of a folded digraph) and what to compare. */
interface Glyph {
  show: string;
  key: string;
}

/** The glyphs of a text; a character folded into several (German ö into oe) is one glyph that shows it and others that do not. */
function glyphsOf(text: string, fold: (char: string) => string): Glyph[] {
  return Array.from(text).flatMap((char) => {
    const folded = Array.from(fold(char));
    if (folded.length <= 1) return [{ show: char, key: folded[0] ?? "" }];
    return folded.map((key, index) => ({ show: index === 0 ? char : "", key }));
  });
}

/**
 * Grades a typed dictation against the model, character by character (`j5-pr1-atelier-oral.md` §2). Both sides are
 * normalised as typed answers are (case, final punctuation, inner punctuation, spaces). Under `lenient`, diacritics
 * are folded on both sides, except й and ї, which are other letters than и and і.
 * `accuracy = max(0, 1 - distance / length of the model)`.
 */
export function gradeDictation(language: string, model: string, answer: string, tolerance: "strict" | "lenient"): DictationGrade {
  const fold = tolerance === "lenient" ? lenientFold(language) : (char: string) => char;
  const expected = glyphsOf(canonical(language, model), fold);
  const typed = glyphsOf(canonical(language, answer), fold);
  const diff: OralToken[] = align(expected, typed, (a, b) => a.key === b.key)
    .map((step) => ({
      text: ((step.op === "extra" ? typed[step.spoken as number] : expected[step.model as number]) as Glyph).show,
      status: step.op,
    }))
    .filter((token) => token.text !== "");
  const length = expected.filter((glyph) => glyph.show !== "").length;
  if (length === 0) return { accuracy: 0, diff };
  const distance = diff.filter((token) => token.status !== "ok").length;
  return { accuracy: Math.max(0, 1 - distance / length), diff };
}

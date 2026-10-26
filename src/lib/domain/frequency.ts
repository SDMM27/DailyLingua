import type { CefrLevel, Language } from "@/lib/schemas/common";
import { normalizeGrammarAnswer } from "./grammar";
import { LANGUAGE_CODES, languageInfo } from "./languages";

/**
 * How easy a short text is, measured by the share of its words among the most frequent forms of its
 * language (phase K2). Pure: the frequency lists are injected as ranks (see
 * `src/lib/frequency/index.ts`, which loads them on the server).
 */

/** Rank (1 = the most frequent) of each normalised form of a language. */
export type FrequencyRanks = ReadonlyMap<string, number>;

/** Under this many counted words a text is too short to conclude: the measure is null. */
export const MIN_COUNTED_WORDS = 8;

/**
 * The form under which a word is looked up. The lists and the measured text go through this same
 * function, so they match: lowercase with the language's own rules, typed-answer normalisation
 * (stress marks, ё/е, Arabic short vowels), and the Greek final sigma written as σ (the way
 * wordfreq writes it).
 */
export function normalizeWord(language: Language, word: string): string {
  return normalizeGrammarAnswer(language, word).replaceAll("ς", "σ");
}

/** Ranks of a list of forms, most frequent first: rank 1 is the first one, duplicates after normalising are skipped. */
export function buildRanks(language: Language, forms: readonly string[]): FrequencyRanks {
  const ranks = new Map<string, number>();
  for (const form of forms) {
    const key = normalizeWord(language, form);
    if (key && !ranks.has(key)) ranks.set(key, ranks.size + 1);
  }
  return ranks;
}

const segmenters = new Map<Language, Intl.Segmenter>();

function segmenter(language: Language): Intl.Segmenter {
  let value = segmenters.get(language);
  if (!value) {
    value = new Intl.Segmenter(language, { granularity: "word" });
    segmenters.set(language, value);
  }
  return value;
}

/** What ends a sentence, the next word being then allowed a capital. */
const SENTENCE_END = /[.!?…。！？؟\n]/u;

interface CountedWord {
  surface: string;
  key: string;
}

/**
 * The words of a text that count: numbers are ignored, and so are capitalised words that do not
 * start a sentence (proper names), in the scripts that have case; German capitalises its common
 * nouns, so nothing is ignored there. Elisions ("l'amico") are looked up whole first, then by what
 * follows the apostrophe, which is how the lists hold them.
 */
function countedWords(language: Language, text: string, ranks: FrequencyRanks): CountedWord[] {
  const { capitalizedCommonNouns } = languageInfo(language);
  const words: CountedWord[] = [];
  let sentenceStart = true;
  for (const part of segmenter(language).segment(text)) {
    if (!part.isWordLike) {
      if (SENTENCE_END.test(part.segment)) sentenceStart = true;
      continue;
    }
    const surface = part.segment;
    const startsSentence = sentenceStart;
    sentenceStart = false;
    if (!/\p{L}/u.test(surface)) continue;
    const first = surface[0];
    const capitalised = first !== first.toLocaleLowerCase(language);
    if (capitalised && !startsSentence && !capitalizedCommonNouns && surface.length > 1) continue;
    let key = normalizeWord(language, surface);
    if (!ranks.has(key)) {
      const tail = key.split(/['’]/u).at(-1);
      if (tail && ranks.has(tail)) key = tail;
    }
    words.push({ surface: surface.toLocaleLowerCase(language), key });
  }
  return words;
}

/**
 * Share (0 to 1) of the words of `text` that are among the `top` most frequent forms of the
 * language, or null when fewer than `MIN_COUNTED_WORDS` words count. Words are cut by
 * `Intl.Segmenter`, which also cuts Chinese and Japanese.
 */
export function lexicalCoverage(language: Language, text: string, ranks: FrequencyRanks, top: number): number | null {
  const words = countedWords(language, text, ranks);
  if (words.length < MIN_COUNTED_WORDS) return null;
  const covered = words.filter((w) => (ranks.get(w.key) ?? Infinity) <= top).length;
  return covered / words.length;
}

/** The distinct words of `text` among the `top` most frequent forms, in reading order, at most `max`. */
export function frequentWords(language: Language, text: string, ranks: FrequencyRanks, top: number, max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of countedWords(language, text, ranks)) {
    if ((ranks.get(word.key) ?? Infinity) > top || seen.has(word.key)) continue;
    seen.add(word.key);
    result.push(word.surface);
    if (result.length >= max) break;
  }
  return result;
}

/** Coverage a text should reach for a level: `share` of its words among the `top` most frequent forms. */
export interface CoverageTarget {
  top: number;
  share: number;
}

/** Levels the ranking looks at the vocabulary of the content for. */
export type CoverageLevel = Extract<CefrLevel, "A1" | "A2">;

const DEFAULT_TARGETS: Record<CoverageLevel, CoverageTarget> = {
  A1: { top: 1000, share: 0.9 },
  A2: { top: 2000, share: 0.9 },
};

/**
 * The target per language and level. All languages start with the same values: the traces of real
 * missions (generation_meta) will tell where one needs its own (Japanese cut by Intl.Segmenter
 * does not follow wordfreq's cutting, so its measured coverage is lower).
 */
export const COVERAGE_TARGETS: Record<Language, Record<CoverageLevel, CoverageTarget>> = Object.fromEntries(
  LANGUAGE_CODES.map((code) => [code, DEFAULT_TARGETS]),
) as Record<Language, Record<CoverageLevel, CoverageTarget>>;

/** The target of a level, or null above A2 (the vocabulary is then not looked at). */
export function coverageTarget(language: Language, level: CefrLevel): CoverageTarget | null {
  return level === "A1" || level === "A2" ? COVERAGE_TARGETS[language][level] : null;
}

/**
 * Largest penalty of the ranking. With the 3-point bonus of learner sources, the spread (9 points)
 * stays under the 10 points of one CEFR level, so the level keeps priority.
 */
export const MAX_COVERAGE_PENALTY = 6;

/**
 * Penalty (0 to 6) for a coverage below the target, proportional to the gap. A text too short to
 * measure gets half the maximum: no evidence either way.
 */
export function coveragePenalty(coverage: number | null, target: CoverageTarget): number {
  if (coverage === null) return MAX_COVERAGE_PENALTY / 2;
  const gap = Math.max(0, target.share - coverage);
  return MAX_COVERAGE_PENALTY * Math.min(1, gap / target.share);
}

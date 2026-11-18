import { isTargetLanguage, languageInfo } from "../languages";
import { ignoreInnerPunctuation, normalizeAnswer } from "./normalize";

/** Words of a text: whitespace-separated tokens; characters ÷ `charsPerWord` where words are not separated. */
export function countWords(language: string, text: string): number {
  const info = isTargetLanguage(language) ? languageInfo(language) : null;
  if (info?.unspaced) {
    const chars = Array.from(text.replace(/[\s\p{P}\p{S}]/gu, "")).length;
    return Math.floor(chars / (info.charsPerWord ?? 1));
  }
  return text.split(/[\s\p{P}\p{S}]+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Tokens compared by the similarity checks: normalised words, or single characters for unspaced scripts. */
function tokens(language: string, text: string): string[] {
  const plain = ignoreInnerPunctuation(text.replaceAll("’", "'"));
  const unspaced = isTargetLanguage(language) && languageInfo(language).unspaced === true;
  const normalized = normalizeAnswer(language, plain);
  return unspaced ? Array.from(normalized) : normalized.split(" ").filter((token) => token !== "");
}

function trigrams(items: readonly string[]): Set<string> {
  // Fewer than three tokens: the tokens themselves are the grams, so that a short text still has some.
  if (items.length < 3) return new Set(items.length === 0 ? [] : [items.join(" ")]);
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= items.length; i++) grams.add(items.slice(i, i + 3).join(" "));
  return grams;
}

/**
 * Jaccard similarity (0 to 1) of the word trigrams of two normalised texts, the measure of the
 * production and duplicate checks (`j2-jeu-xp-serie.md` §1, `j2-seance-contenu.md` §3.5). Two empty texts: 0.
 */
export function trigramSimilarity(language: string, a: string, b: string): number {
  const left = trigrams(tokens(language, a));
  const right = trigrams(tokens(language, b));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared++;
  return shared / (left.size + right.size - shared);
}

/** Levenshtein distance between two strings, in characters (code points). */
function editDistance(a: readonly string[], b: readonly string[]): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min((previous[j] as number) + 1, (row[j - 1] as number) + 1, (previous[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length] as number;
}

/** Character similarity (0 to 1) of two sentences once normalised: 1 minus the edit distance over the longer length. */
export function characterSimilarity(language: string, a: string, b: string): number {
  const left = Array.from(normalizeAnswer(language, ignoreInnerPunctuation(a.replaceAll("’", "'"))));
  const right = Array.from(normalizeAnswer(language, ignoreInnerPunctuation(b.replaceAll("’", "'"))));
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - editDistance(left, right) / longest;
}

import { normalizeAnswer } from "../grading/normalize";
import { isTargetLanguage } from "../languages";

/** Counts occurrences of exact written forms supported by the learner's vocabulary history. */
export function estimateReadingCoverage(body: string, language: string, vocabulary: readonly string[]) {
  if (!isTargetLanguage(language) || vocabulary.length === 0) return null;
  const forms = new Set(vocabulary.map((word) => normalizeAnswer(language, word)).filter(Boolean));
  if (forms.size === 0) return null;
  let recognized = 0;
  let total = 0;
  const words = new Intl.Segmenter(language, { granularity: "word" });
  for (const { segment, isWordLike } of words.segment(body)) {
    if (!isWordLike || !/\p{L}/u.test(segment)) continue;
    total++;
    if (forms.has(normalizeAnswer(language, segment))) recognized++;
  }
  return total > 0 ? { recognized, total, ratio: recognized / total } : null;
}

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

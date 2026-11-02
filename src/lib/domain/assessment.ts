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

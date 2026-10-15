/**
 * Word stress is written as a combining acute accent after the stressed vowel ("слóво"): plain
 * text, so it needs no schema or database change and shows wherever the word is shown.
 */
export const STRESS_MARK = "́";

/**
 * The text without its stress marks, to compare words whether or not the stress is written.
 * Only meant for languages whose letters have no precomposed acute form (Cyrillic): in Latin
 * scripts "é" is a letter, and a decomposed one would lose it.
 */
export function stripStress(text: string): string {
  return text.replaceAll(STRESS_MARK, "");
}

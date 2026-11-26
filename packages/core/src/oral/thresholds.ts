/** Thresholds of the oral workshop (`j5-pr1-atelier-oral.md` §2). */

/** A repetition counts from this share of right words (`shadowing.sentence`). */
export const SHADOWING_MIN_RATIO = 0.6;
/** A dictation counts from this accuracy (1 XP), and pays double from `DICTATION_HIGH_ACCURACY` (2 XP). */
export const DICTATION_MIN_ACCURACY = 0.8;
export const DICTATION_HIGH_ACCURACY = 0.95;
/** Shortest time that saying a sentence can take: this many milliseconds for each word of the model. */
export const MIN_SPEAKING_MS_PER_WORD = 250;
/** Shortest time between showing a dictation and its answer. */
export const MIN_DICTATION_MS = 1000;
/** A word this long (letters) or longer, one letter off, still counts as said: the recognition spells some words differently. */
export const NEAR_MATCH_MIN_LETTERS = 5;

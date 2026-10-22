import { z } from "zod";
import { dateKeySchema, languageSchema } from "./common";
import { reviewStateSchema } from "./vocabulary";

/**
 * Alphabets: curated letter data, one file per language in `src/lib/alphabets/`. A group of
 * letters practised successfully becomes a spaced-repetition card (`alphabet_cards`), scheduled
 * like the grammar cards. The exercises are generated from the letter data, not authored.
 */

/** Longest run through the exercises of a group (the client may drop the listening ones). */
export const ALPHABET_PRACTICE_MAX = 20;

export const ALPHABET_LIMITS = {
  groupLetters: { min: 6, max: 8 },
  groupWords: { min: 4, max: 8 },
} as const;

const text = (max: number) => z.string().trim().min(1).max(max);

/** One user-perceived character (a letter, not a letter with a combining mark of its own). */
const grapheme = z
  .string()
  .min(1)
  .refine((s) => [...new Intl.Segmenter().segment(s)].length === 1, { message: "must be a single grapheme" });

export const ALPHABET_SCRIPTS = ["cyrillic"] as const;
export const alphabetScriptSchema = z.enum(ALPHABET_SCRIPTS);
export type AlphabetScript = z.infer<typeof alphabetScriptSchema>;

/**
 * How a letter relates to the Latin alphabet: "same" looks and sounds alike, "false-friend" looks
 * like a Latin letter but sounds different, "new" has an unfamiliar shape, "sign" has no sound of
 * its own.
 */
export const ALPHABET_LETTER_KINDS = ["same", "false-friend", "new", "sign"] as const;
export const alphabetLetterKindSchema = z.enum(ALPHABET_LETTER_KINDS);
export type AlphabetLetterKind = z.infer<typeof alphabetLetterKindSchema>;

export const alphabetWordSchema = z.object({
  /** In the studied language, stress marked on polysyllables (combining acute, as in the grammar courses). */
  word: text(40),
  /** French. */
  translation: text(60),
});
export type AlphabetWord = z.infer<typeof alphabetWordSchema>;

export const alphabetLetterSchema = z
  .object({
    upper: grapheme,
    lower: grapheme,
    /** The name of the letter in the language, e.g. « бэ ». */
    name: text(20),
    /** Letter-by-letter transliteration, unique within an alphabet. */
    latin: text(4),
    /** French, how it sounds. */
    soundFr: text(160),
    kind: alphabetLetterKindSchema,
    /** The Latin letter it resembles; required for a false friend. */
    lookalike: text(2).optional(),
    example: alphabetWordSchema,
  })
  .refine((l) => l.kind !== "false-friend" || l.lookalike !== undefined, {
    message: "a false friend needs a lookalike",
    path: ["lookalike"],
  });
export type AlphabetLetter = z.infer<typeof alphabetLetterSchema>;

/** Stable id `<lang>-alphabet-<n>`, e.g. `ru-alphabet-2`. Never reuse or rename one: cards point to it. */
export const alphabetGroupIdSchema = z.string().regex(/^[a-z]{2,3}-alphabet-[1-9][0-9]?$/);

export const alphabetGroupSchema = z.object({
  id: alphabetGroupIdSchema,
  /** French, short. */
  title: text(80),
  /** French, one line shown in the list. */
  summary: text(160),
  /** Lowercase letters of the group. */
  letters: z.array(grapheme).min(ALPHABET_LIMITS.groupLetters.min).max(ALPHABET_LIMITS.groupLetters.max),
  /** Reading words made of the letters of this group and the previous ones. */
  words: z.array(alphabetWordSchema).min(ALPHABET_LIMITS.groupWords.min).max(ALPHABET_LIMITS.groupWords.max),
  /** French. */
  tip: text(300).optional(),
});
export type AlphabetGroup = z.infer<typeof alphabetGroupSchema>;

export const alphabetSchema = z.object({
  language: languageSchema,
  script: alphabetScriptSchema,
  /** Date of the last change to the letters (`YYYY-MM-DD`). */
  version: dateKeySchema,
  /** The whole alphabet, in alphabetical order. */
  letters: z.array(alphabetLetterSchema).min(1),
  /** In teaching order. */
  groups: z.array(alphabetGroupSchema).min(1),
  /** Day a native speaker approved the whole alphabet; null = draft, hidden in production. */
  reviewedOn: dateKeySchema.nullable(),
});
export type Alphabet = z.infer<typeof alphabetSchema>;

/** A group of letters practised successfully, kept as a review card. */
export const alphabetCardSchema = z.object({
  id: z.string().min(1),
  groupId: alphabetGroupIdSchema,
  language: languageSchema,
  status: z.enum(["learning", "known"]),
  review: reviewStateSchema,
  addedOn: dateKeySchema,
});
export type AlphabetCard = z.infer<typeof alphabetCardSchema>;

/** Result of one run through the exercises of a group, sent by the client. */
export const recordAlphabetPracticeInputSchema = z
  .object({
    groupId: alphabetGroupIdSchema,
    correct: z.number().int().min(0).max(ALPHABET_PRACTICE_MAX),
    total: z.number().int().min(1).max(ALPHABET_PRACTICE_MAX),
    /** Review count of the card the user saw; null when they had no card. Refused if it changed since. */
    expectedReviewCount: z.number().int().nonnegative().nullable(),
  })
  .refine((i) => i.correct <= i.total, { message: "correct > total", path: ["correct"] });
export type RecordAlphabetPracticeInput = z.infer<typeof recordAlphabetPracticeInputSchema>;

/** Answers to the reading check of a language; `day` is the day the check was drawn (its seed). */
export const recordAlphabetCheckInputSchema = z.object({
  language: languageSchema,
  day: dateKeySchema,
  /** The option picked for each question, null for « Je ne sais pas ». */
  choices: z.array(z.number().int().min(0).max(3).nullable()).min(1).max(40),
});
export type RecordAlphabetCheckInput = z.infer<typeof recordAlphabetCheckInputSchema>;

/** A generated question; `options` are 4 distinct strings and `answer` indexes the right one. */
export type AlphabetExercise =
  | { type: "letter-to-latin"; upper: string; lower: string; options: string[]; answer: number }
  | { type: "latin-to-letter"; latin: string; soundFr: string; options: string[]; answer: number }
  | { type: "read-word"; word: string; options: string[]; answer: number }
  | { type: "listen-word"; word: string; options: string[]; answer: number };

import {
  ALPHABET_PRACTICE_MAX,
  type Alphabet,
  type AlphabetCard,
  type AlphabetExercise,
  type AlphabetGroup,
  type AlphabetLetter,
  type AlphabetScript,
} from "@/lib/schemas/alphabet";
import type { GrammarPracticeOutcome } from "./grammar";
import { decomposeHangul, HANGUL_VOWELS, type HangulPosition } from "./hangul";
import { stripStress } from "./stress";

/** The name of a script, as in « Apprendre à lire le cyrillique ». */
export const ALPHABET_SCRIPT_NAMES: Record<AlphabetScript, string> = {
  cyrillic: "cyrillique",
  hangul: "hangeul",
};

/** Every question offers this many options, the right one included. */
const OPTION_COUNT = 4;
/** Questions asked about the reading words of a group, written and heard. */
const READ_WORD_QUESTIONS = 3;
const LISTEN_WORD_QUESTIONS = 2;

function normalizeWord(word: string): string {
  return stripStress(word.normalize("NFC")).toLowerCase();
}

/** One letter of a word; `position` (hangul only) is its place in the syllable block. */
interface WordLetter {
  char: string;
  position?: HangulPosition;
}

/**
 * A word taken apart into the letters the alphabet teaches. Cyrillic: stress dropped, lowercased,
 * one letter per character. Hangul: the syllable blocks decomposed into jamo, each with its position.
 * Anything that is not a letter is kept as is.
 */
export function wordLetters(alphabet: Alphabet, word: string): WordLetter[] {
  if (alphabet.script === "hangul") return decomposeHangul(word);
  return [...normalizeWord(word)].map((char) => ({ char }));
}

/**
 * How `letter` reads at `index` of `letters`. Most letters read as their `latin` form; in hangul,
 * a silent initial reads as nothing, and a final takes its `latinFinal` form unless the next
 * syllable starts with a silent initial (the consonant then moves to it: 옷이 reads "osi").
 */
function letterReading(alphabet: Alphabet, letters: WordLetter[], index: number, letter: AlphabetLetter): string {
  const position = letters[index].position;
  if (alphabet.script !== "hangul" || !position) return letter.latin;
  if (position === "initial") return letter.silentInitial ? "" : letter.latin;
  if (position === "final") {
    const next = letters[index + 1];
    const nextLetter = next?.position === "initial" ? alphabet.letters.find((l) => l.lower === next.char) : undefined;
    return nextLetter?.silentInitial ? letter.latin : (letter.latinFinal ?? letter.latin);
  }
  return letter.latin;
}

/** Letter-by-letter reading of a word: stress dropped, lowercased, anything but a letter kept. */
export function transliterate(alphabet: Alphabet, word: string): string {
  const byLower = new Map(alphabet.letters.map((l) => [l.lower, l]));
  const letters = wordLetters(alphabet, word);
  return letters
    .map((token, index) => {
      const letter = byLower.get(token.char);
      return letter ? letterReading(alphabet, letters, index, letter) : token.char;
    })
    .join("");
}

/** A seeded pseudo-random generator in [0, 1) (mulberry32 over an FNV-1a hash of the seed). */
export function seededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;

function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Four options in random order, the right one among them. Distractors come from `preferred`,
 * then `fallback`, in order, each distinct (by `key`) from the answer and from each other.
 */
function withOptions(
  answer: string,
  preferred: readonly string[],
  fallback: readonly string[],
  random: Random,
  key: (value: string) => string = (value) => value,
): { options: string[]; answer: number } {
  const taken = new Set([key(answer)]);
  const distractors: string[] = [];
  for (const candidate of [...preferred, ...fallback]) {
    if (distractors.length === OPTION_COUNT - 1) break;
    if (taken.has(key(candidate))) continue;
    taken.add(key(candidate));
    distractors.push(candidate);
  }
  const options = shuffled([answer, ...distractors], random);
  return { options, answer: options.indexOf(answer) };
}

/** Letters taught up to and including the group, and the letters of the group itself. */
function groupLetters(alphabet: Alphabet, groupIndex: number): { learned: AlphabetLetter[]; own: AlphabetLetter[] } {
  const byLower = new Map(alphabet.letters.map((l) => [l.lower, l]));
  const lettersOf = (group: AlphabetGroup) =>
    group.letters.flatMap((char) => {
      const letter = byLower.get(char);
      return letter ? [letter] : [];
    });
  return {
    learned: alphabet.groups.slice(0, groupIndex + 1).flatMap(lettersOf),
    own: lettersOf(alphabet.groups[groupIndex]),
  };
}

/** The label of a letter as an answer: both cases, "Р р"; a letter without case, once ("ㄱ"). */
export function letterLabel(letter: Pick<AlphabetLetter, "upper" | "lower">): string {
  return letter.upper === letter.lower ? letter.lower : `${letter.upper} ${letter.lower}`;
}

function letterToLatin(letter: AlphabetLetter, learned: AlphabetLetter[], all: AlphabetLetter[], random: Random): AlphabetExercise {
  // A false friend is mistaken for the Latin letter it looks like: offer that one first.
  const lookalike = letter.kind === "false-friend" && letter.lookalike ? [letter.lookalike] : [];
  const { options, answer } = withOptions(
    letter.latin,
    [...lookalike, ...shuffled(learned, random).map((l) => l.latin)],
    shuffled(all, random).map((l) => l.latin),
    random,
  );
  return { type: "letter-to-latin", upper: letter.upper, lower: letter.lower, options, answer };
}

function latinToLetter(letter: AlphabetLetter, learned: AlphabetLetter[], all: AlphabetLetter[], random: Random): AlphabetExercise {
  // Letters that look like the Latin letter shown are the natural wrong answers.
  const lookingAlike = learned.filter((l) => l.lookalike === letter.latin);
  const { options, answer } = withOptions(
    letterLabel(letter),
    [...lookingAlike, ...shuffled(learned, random)].map(letterLabel),
    shuffled(all, random).map(letterLabel),
    random,
  );
  return { type: "latin-to-letter", latin: letter.latin, soundFr: letter.soundFr, options, answer };
}

/**
 * Wrong readings of a word, one letter read as another: `preferred` reads a false friend as the
 * Latin letter it looks like, `others` reads a letter as some other learned letter.
 */
function misreadings(
  alphabet: Alphabet,
  word: string,
  learned: AlphabetLetter[],
  random: Random,
): { preferred: string[]; others: string[] } {
  const byLower = new Map(alphabet.letters.map((l) => [l.lower, l]));
  const letters = wordLetters(alphabet, word);
  const tokens = letters.map((token, index) => {
    const letter = byLower.get(token.char);
    return { letter, reading: letter ? letterReading(alphabet, letters, index, letter) : token.char };
  });
  const replaced = (index: number, reading: string) => tokens.map((t, i) => (i === index ? reading : t.reading)).join("");
  const preferred: string[] = [];
  const others: string[] = [];
  tokens.forEach((token, index) => {
    if (!token.letter) return;
    if (token.letter.kind === "false-friend" && token.letter.lookalike) preferred.push(replaced(index, token.letter.lookalike));
    // In hangul a vowel is only mistaken for another vowel, a consonant for another consonant.
    const isVowel = HANGUL_VOWELS.has(token.letter.lower);
    const candidates =
      alphabet.script === "hangul" ? learned.filter((l) => HANGUL_VOWELS.has(l.lower) === isVowel) : learned;
    for (const other of shuffled(candidates, random).slice(0, 3)) {
      others.push(replaced(index, letterReading(alphabet, letters, index, other)));
    }
  });
  return { preferred, others };
}

function readWord(alphabet: Alphabet, group: AlphabetGroup, word: string, learned: AlphabetLetter[], random: Random): AlphabetExercise {
  const correct = transliterate(alphabet, word);
  const { preferred, others } = misreadings(alphabet, word, learned, random);
  const otherWords = group.words.map((w) => transliterate(alphabet, w.word));
  const { options, answer } = withOptions(
    correct,
    [...shuffled(preferred, random), ...shuffled([...others, ...otherWords], random)],
    // Any one-letter misreading, when the word is too short for the above to give three.
    alphabet.letters.flatMap((l) => misreadings(alphabet, word, [l], () => 0).others),
    random,
  );
  return { type: "read-word", word, options, answer };
}

function listenWord(word: string, learnedWords: string[], otherWords: string[], random: Random): AlphabetExercise {
  const length = normalizeWord(word).length;
  // Words of a similar length are the plausible wrong answers.
  const byLength = (words: string[]) =>
    shuffled(words, random).sort((a, b) => Math.abs(normalizeWord(a).length - length) - Math.abs(normalizeWord(b).length - length));
  const { options, answer } = withOptions(word, byLength(learnedWords), byLength(otherWords), random, normalizeWord);
  return { type: "listen-word", word, options, answer };
}

/**
 * The questions of one run through a group: every letter once (asked in turn from the letter and
 * from its Latin reading), 3 words to read and 2 to listen to, in an order fixed by the seed.
 * Generated, not authored: the same seed always gives the same run.
 */
export function buildAlphabetExercises(alphabet: Alphabet, groupId: string, seed: string): AlphabetExercise[] {
  const groupIndex = alphabet.groups.findIndex((g) => g.id === groupId);
  if (groupIndex < 0) return [];
  const group = alphabet.groups[groupIndex];
  const random = seededRandom(`${alphabet.language}:${seed}`);
  const { learned, own } = groupLetters(alphabet, groupIndex);

  const letterQuestions = own.map((letter, index) =>
    index % 2 === 0
      ? letterToLatin(letter, learned, alphabet.letters, random)
      : latinToLetter(letter, learned, alphabet.letters, random),
  );

  const words = shuffled(group.words, random);
  const toRead = words.slice(0, READ_WORD_QUESTIONS);
  // Listening goes to the words not already read, as long as there are enough of them.
  const toHear = [...words.slice(READ_WORD_QUESTIONS), ...words].slice(0, LISTEN_WORD_QUESTIONS);
  // Written candidates: the words taught so far, then (if too few) the example of every letter.
  const learnedWords = alphabet.groups.slice(0, groupIndex + 1).flatMap((g) => g.words.map((w) => w.word));
  const otherWords = alphabet.letters.map((l) => l.example.word);

  const wordQuestions = [
    ...toRead.map((w) => readWord(alphabet, group, w.word, learned, random)),
    ...toHear.map((w) => listenWord(w.word, learnedWords, otherWords, random)),
  ];
  return shuffled([...letterQuestions, ...wordQuestions], random).slice(0, ALPHABET_PRACTICE_MAX);
}

/** Every group of the alphabet has a review card. */
export function isAlphabetComplete(alphabet: Alphabet, cards: readonly Pick<AlphabetCard, "groupId">[]): boolean {
  return alphabet.groups.every((g) => cards.some((c) => c.groupId === g.id));
}

/** Words read per group in the reading check, and the share of right answers that passes it. */
export const ALPHABET_CHECK_WORDS_PER_GROUP = 2;
export const ALPHABET_CHECK_PASS = 0.9;

/**
 * The reading check: for every group, 2 of its words to read, all questions mixed. Every letter of
 * the alphabet may appear in a wrong answer (the learner is supposed to know them all). Same seed,
 * same check: the server rebuilds it to grade the answers.
 */
export function buildAlphabetCheck(alphabet: Alphabet, seed: string): AlphabetExercise[] {
  const random = seededRandom(`${alphabet.language}:${seed}`);
  const questions = alphabet.groups.flatMap((group) =>
    shuffled(group.words, random)
      .slice(0, ALPHABET_CHECK_WORDS_PER_GROUP)
      .map((w) => readWord(alphabet, group, w.word, alphabet.letters, random)),
  );
  return shuffled(questions, random);
}

/** Result of a reading check; `choices` are the option indexes picked, null for « Je ne sais pas ». */
export function gradeAlphabetCheck(
  exercises: readonly AlphabetExercise[],
  choices: readonly (number | null)[],
): { correct: number; total: number; passed: boolean } {
  const total = exercises.length;
  const correct = exercises.filter((e, i) => choices[i] === e.answer).length;
  return { correct, total, passed: choices.length === total && total > 0 && correct / total >= ALPHABET_CHECK_PASS };
}

/** What the server answers once a reading check is graded. */
export interface AlphabetCheckResult {
  correct: number;
  total: number;
  passed: boolean;
  /** Groups newly marked as known (0 when failed, or when they all had a card already). */
  marked: number;
}

/** What the server answers once a run is recorded (or not). */
export interface AlphabetPracticeResult {
  outcome: GrammarPracticeOutcome;
  /** The card after the run; null when the learner has none (not passed). */
  card: AlphabetCard | null;
}

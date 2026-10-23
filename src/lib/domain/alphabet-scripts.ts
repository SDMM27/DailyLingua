import type { Alphabet, AlphabetLetter, AlphabetScript } from "@/lib/schemas/alphabet";
import { decomposeHangul, HANGUL_VOWELS, type HangulPosition } from "./hangul";
import { stripStress } from "./stress";

/**
 * Reading rules of each script: how a word is cut into tokens, how a token reads in its context,
 * and which letters can be mistaken for one another. Pure: no React or Next imports.
 */

/** One token of a word; `position` (hangul only) is its place in the syllable block. */
export interface WordToken {
  char: string;
  position?: HangulPosition;
}

/** A word being read: its tokens, and what each one is and reads. */
export interface ReadingContext {
  alphabet: Alphabet;
  tokens: WordToken[];
  /** The letter a token stands for; undefined for anything that is not a letter (kept as is). */
  letterAt(index: number): AlphabetLetter | undefined;
  /** The contextual reading of a token, or the token itself when it is not a letter. */
  readAt(index: number): string;
}

export interface ScriptRules {
  tokenize(word: string): WordToken[];
  /** How `letter` reads at `index` of the word (it may be another letter than the token, for a wrong answer). */
  read(context: ReadingContext, index: number, letter: AlphabetLetter): string;
  /** A letter is only mistaken for a letter of its own class. */
  letterClass(letter: AlphabetLetter): string;
}

const VOWELS = "aeiou";

const cyrillic: ScriptRules = {
  tokenize: (word) => [...stripStress(word.normalize("NFC")).toLowerCase()].map((char) => ({ char })),
  read: (_context, _index, letter) => letter.latin,
  letterClass: () => "letter",
};

/**
 * Hangul: a silent initial reads as nothing, and a final takes its `latinFinal` form unless the
 * next syllable starts with a silent initial (the consonant then moves to it: 옷이 reads "osi").
 */
const hangul: ScriptRules = {
  tokenize: decomposeHangul,
  read: (context, index, letter) => {
    const position = context.tokens[index].position;
    if (!position) return letter.latin;
    if (position === "initial") return letter.silentInitial ? "" : letter.latin;
    if (position === "final") {
      const next = context.tokens[index + 1];
      const nextLetter = next?.position === "initial" ? context.letterAt(index + 1) : undefined;
      return nextLetter?.silentInitial ? letter.latin : (letter.latinFinal ?? letter.latin);
    }
    return letter.latin;
  },
  letterClass: (letter) => (HANGUL_VOWELS.has(letter.lower) ? "vowel" : "consonant"),
};

const GREEK_COMBINING_MARKS = /[̀-ͯ]/g;
/** After α, ε or η, υ reads "f" before these letters (voiceless) and at the end of a word, else "v". */
const GREEK_VOICELESS = new Set([..."θκξπστφχψ"]);

const greek: ScriptRules = {
  tokenize: (word) =>
    [...word.normalize("NFD").replace(GREEK_COMBINING_MARKS, "").toLowerCase().replaceAll("ς", "σ")].map((char) => ({ char })),
  read: (context, index, letter) => {
    if (letter.lower !== "υ") return letter.latin;
    const before = context.tokens[index - 1]?.char;
    if (before === "ο") return "u";
    if (before === "α" || before === "ε" || before === "η") {
      const next = context.tokens[index + 1]?.char;
      return next === undefined || GREEK_VOICELESS.has(next) ? "f" : "v";
    }
    return letter.latin;
  },
  letterClass: () => "letter",
};

const SMALL_YA_YU_YO = new Set([..."ゃゅょャュョ"]);
const SMALL_TSU = new Set([..."っッ"]);
const PROLONGED = "ー";

const kana: ScriptRules = {
  tokenize: (word) => [...word.normalize("NFC")].map((char) => ({ char })),
  read: (context, index, letter) => {
    const own = letter.lower;
    const following = context.tokens[index + 1]?.char;
    if (SMALL_YA_YU_YO.has(own)) {
      // Merges with the syllable before it, which loses its final "i": き + ょ = ky + o.
      const before = context.letterAt(index - 1);
      if (!before || !before.latin.endsWith("i")) return letter.latin;
      const stem = before.latin.slice(0, -1);
      return /(sh|ch|j)$/.test(stem) ? letter.latin.slice(-1) : letter.latin;
    }
    if (SMALL_TSU.has(own)) {
      const next = following === undefined ? "" : context.readAt(index + 1);
      if (next === "" || VOWELS.includes(next[0])) return "";
      return next.startsWith("ch") ? "t" : next[0];
    }
    if (own === PROLONGED) {
      const previous = index > 0 ? context.readAt(index - 1) : "";
      return [...previous].reverse().find((c) => VOWELS.includes(c)) ?? "";
    }
    if (following !== undefined && SMALL_YA_YU_YO.has(following) && letter.latin.endsWith("i")) return letter.latin.slice(0, -1);
    return letter.latin;
  },
  letterClass: (letter) => (letter.kind === "sign" ? "sign" : (letter.series ?? "letter")),
};

const TATWEEL = "ـ";
const SHADDA = "ّ";
const SUKUN = "ْ";
const FATHA = "َ";
const DAMMA = "ُ";
const KASRA = "ِ";
const SHORT_VOWELS = new Set([FATHA, DAMMA, KASRA]);

/** A haraka: fatha, damma, kasra, shadda or sukun. */
function isHaraka(char: string | undefined): boolean {
  return char !== undefined && char >= FATHA && char <= SUKUN;
}

const arabic: ScriptRules = {
  tokenize: (word) => {
    const chars: string[] = [];
    for (const char of word.normalize("NFC")) {
      if (char === TATWEEL) continue;
      if (char === SHADDA) {
        // NFC writes the shadda after the vowel; it is read right after its letter, before the vowel.
        let at = chars.length;
        while (at > 0 && SHORT_VOWELS.has(chars[at - 1])) at--;
        chars.splice(at, 0, char);
      } else {
        chars.push(char);
      }
    }
    return chars.map((char) => ({ char }));
  },
  read: (context, index, letter) => {
    const { tokens } = context;
    const before = tokens[index - 1]?.char;
    const next = tokens[index + 1]?.char;
    const afterNext = tokens[index + 2]?.char;
    switch (letter.lower) {
      case SUKUN:
        return "";
      case SHADDA:
        return index > 0 ? context.readAt(index - 1) : "";
      case FATHA:
        return next === "ا" ? "" : letter.latin;
      case DAMMA:
        return next === "و" && !isHaraka(afterNext) ? "" : letter.latin;
      case KASRA:
        return next === "ي" && !isHaraka(afterNext) ? "" : letter.latin;
      case "و":
        return before === DAMMA && !isHaraka(next) ? "ū" : letter.latin;
      case "ي":
        return before === KASRA && !isHaraka(next) ? "ī" : letter.latin;
      case "ة":
        return before === FATHA ? "" : letter.latin;
      case "أ":
        return index === 0 ? "" : letter.latin;
      default:
        return letter.latin;
    }
  },
  letterClass: (letter) => (letter.kind === "sign" ? "sign" : "letter"),
};

const RULES: Record<AlphabetScript, ScriptRules> = { cyrillic, hangul, greek, kana, arabic };

export function scriptRules(script: AlphabetScript): ScriptRules {
  return RULES[script];
}

/** A word as read in context: tokens, the letter each one is, and each one's reading. */
export function readingContext(alphabet: Alphabet, word: string): ReadingContext {
  const rules = RULES[alphabet.script];
  const byLower = new Map(alphabet.letters.map((l) => [l.lower, l]));
  const tokens = rules.tokenize(word);
  const context: ReadingContext = {
    alphabet,
    tokens,
    letterAt: (index) => (tokens[index] ? byLower.get(tokens[index].char) : undefined),
    readAt: (index) => {
      const letter = context.letterAt(index);
      return letter ? rules.read(context, index, letter) : (tokens[index]?.char ?? "");
    },
  };
  return context;
}

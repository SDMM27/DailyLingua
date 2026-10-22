/**
 * Hangeul syllable blocks (U+AC00–U+D7A3) taken apart into compatibility jamo, the letters the
 * Korean alphabet teaches. Pure: no React or Next imports.
 */

export type HangulPosition = "initial" | "vowel" | "final";

/** A letter of a word; `position` is absent for what is not part of a syllable block (space, digit, Latin...). */
export interface HangulToken {
  char: string;
  position?: HangulPosition;
}

const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;

const INITIALS = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const VOWELS = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
/** Index 0 is "no final"; the others are the 27 finals, compound ones included. */
const FINALS = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

/** A compound final is two consonants in one block position. */
const COMPOUND_FINALS: Record<string, [string, string]> = {
  ㄳ: ["ㄱ", "ㅅ"],
  ㄵ: ["ㄴ", "ㅈ"],
  ㄶ: ["ㄴ", "ㅎ"],
  ㄺ: ["ㄹ", "ㄱ"],
  ㄻ: ["ㄹ", "ㅁ"],
  ㄼ: ["ㄹ", "ㅂ"],
  ㄽ: ["ㄹ", "ㅅ"],
  ㄾ: ["ㄹ", "ㅌ"],
  ㄿ: ["ㄹ", "ㅍ"],
  ㅀ: ["ㄹ", "ㅎ"],
  ㅄ: ["ㅂ", "ㅅ"],
};

/** The vowel jamo (ㅏ ㅓ ㅗ ...), the rest of the alphabet being consonants. */
export const HANGUL_VOWELS: ReadonlySet<string> = new Set(VOWELS);

/** The jamo of a word in reading order; anything but a syllable block passes through unchanged. */
export function decomposeHangul(word: string): HangulToken[] {
  return [...word.normalize("NFC")].flatMap((char): HangulToken[] => {
    const code = char.codePointAt(0)!;
    if (code < SYLLABLE_FIRST || code > SYLLABLE_LAST) return [{ char }];
    const index = code - SYLLABLE_FIRST;
    const tokens: HangulToken[] = [
      { char: INITIALS[Math.floor(index / 588)], position: "initial" },
      { char: VOWELS[Math.floor((index % 588) / 28)], position: "vowel" },
    ];
    const final = FINALS[index % 28];
    if (final) for (const part of COMPOUND_FINALS[final] ?? [final]) tokens.push({ char: part, position: "final" });
    return tokens;
  });
}

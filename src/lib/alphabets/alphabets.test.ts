import { describe, expect, it } from "vitest";
import { wordLetters } from "@/lib/domain/alphabet";
import { stripStress } from "@/lib/domain/stress";
import { alphabetSchema } from "@/lib/schemas/alphabet";
import { ALPHABETS, alphabetGroup, alphabetLanguages } from ".";

/** Letters and groups expected per alphabet. */
const SIZES: Record<string, { letters: number; groups: number }> = {
  ru: { letters: 33, groups: 5 },
  uk: { letters: 33, groups: 5 },
  ko: { letters: 40, groups: 6 },
  el: { letters: 24, groups: 4 },
  ar: { letters: 35, groups: 5 },
  ja: { letters: 151, groups: 16 },
};

describe("alphabets", () => {
  it("covers Arabic, Greek, Japanese, Korean, Russian and Ukrainian", () => {
    expect(alphabetLanguages().sort()).toEqual(Object.keys(SIZES).sort());
    expect(alphabetGroup("ru-alphabet-2")?.language).toBe("ru");
    expect(alphabetGroup("xx-alphabet-1")).toBeUndefined();
  });

  describe.each(Object.entries(ALPHABETS))("the %s alphabet", (code, alphabet) => {
    it("parses and has the expected letters and groups", () => {
      expect(() => alphabetSchema.parse(alphabet)).not.toThrow();
      expect(alphabet.language).toBe(code);
      expect(alphabet.letters).toHaveLength(SIZES[code].letters);
      expect(alphabet.groups).toHaveLength(SIZES[code].groups);
    });

    it("is a draft until a native speaker has reviewed it", () => {
      expect(alphabet.reviewedOn).toBeNull();
    });

    it("puts every letter in exactly one group, and only known letters in groups", () => {
      const known = alphabet.letters.map((l) => l.lower);
      expect(new Set(known).size).toBe(known.length);
      const grouped = alphabet.groups.flatMap((g) => g.letters);
      expect(grouped.slice().sort()).toEqual(known.slice().sort());
    });

    it("gives each letter its own Latin reading, signs aside, within a series", () => {
      // Hiragana あ and katakana ア both read "a": the series tell them apart.
      const latin = alphabet.letters.filter((l) => l.kind !== "sign").map((l) => `${l.series ?? ""}:${l.latin}`);
      expect(new Set(latin).size).toBe(latin.length);
    });

    it("numbers the groups in order, with the language as prefix", () => {
      expect(alphabet.groups.map((g) => g.id)).toEqual(Array.from({ length: SIZES[code].groups }, (_, i) => i + 1).map((n) => `${code}-alphabet-${n}`));
    });

    it("has upper and lower case that match, and a lookalike for every false friend", () => {
      for (const letter of alphabet.letters) {
        // A script without case has the same letter twice.
        expect(letter.upper.toLowerCase()).toBe(letter.lower);
        if (letter.kind === "false-friend") expect(letter.lookalike).toBeTruthy();
      }
    });

    it("has 6 to 10 letters per group", () => {
      for (const group of alphabet.groups) {
        expect(group.letters.length, group.id).toBeGreaterThanOrEqual(6);
        expect(group.letters.length, group.id).toBeLessThanOrEqual(10);
      }
    });

    it("has 4 to 8 reading words per group, made of the letters learned so far", () => {
      const learned = new Set<string>();
      for (const group of alphabet.groups) {
        group.letters.forEach((c) => learned.add(c));
        expect(group.words.length).toBeGreaterThanOrEqual(4);
        expect(group.words.length).toBeLessThanOrEqual(8);
        for (const { word } of group.words) {
          const letters = wordLetters(alphabet, word);
          expect(letters.length, word).toBeGreaterThanOrEqual(2);
          expect([...new Intl.Segmenter().segment(stripStress(word))].length, word).toBeLessThanOrEqual(7);
          for (const { char } of letters) expect(learned.has(char), `${word} (${group.id})`).toBe(true);
        }
      }
    });

    it("uses each reading word once", () => {
      const words = alphabet.groups.flatMap((g) => g.words.map((w) => stripStress(w.word)));
      expect(new Set(words).size).toBe(words.length);
    });
  });
});

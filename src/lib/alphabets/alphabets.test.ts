import { describe, expect, it } from "vitest";
import { stripStress } from "@/lib/domain/stress";
import { alphabetSchema } from "@/lib/schemas/alphabet";
import { ALPHABETS, alphabetGroup, alphabetLanguages } from ".";

describe("alphabets", () => {
  it("covers Russian and Ukrainian", () => {
    expect(alphabetLanguages().sort()).toEqual(["ru", "uk"]);
    expect(alphabetGroup("ru-alphabet-2")?.language).toBe("ru");
    expect(alphabetGroup("xx-alphabet-1")).toBeUndefined();
  });

  describe.each(Object.entries(ALPHABETS))("the %s alphabet", (code, alphabet) => {
    it("parses and has 33 letters in 5 groups", () => {
      expect(() => alphabetSchema.parse(alphabet)).not.toThrow();
      expect(alphabet.language).toBe(code);
      expect(alphabet.letters).toHaveLength(33);
      expect(alphabet.groups).toHaveLength(5);
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

    it("gives each letter its own Latin reading", () => {
      const latin = alphabet.letters.map((l) => l.latin);
      expect(new Set(latin).size).toBe(latin.length);
    });

    it("numbers the groups in order, with the language as prefix", () => {
      expect(alphabet.groups.map((g) => g.id)).toEqual([1, 2, 3, 4, 5].map((n) => `${code}-alphabet-${n}`));
    });

    it("has upper and lower case that match, and a lookalike for every false friend", () => {
      for (const letter of alphabet.letters) {
        expect(letter.upper.toLowerCase()).toBe(letter.lower);
        if (letter.kind === "false-friend") expect(letter.lookalike).toBeTruthy();
      }
    });

    it("has 4 to 8 reading words per group, made of the letters learned so far", () => {
      const learned = new Set<string>();
      for (const group of alphabet.groups) {
        group.letters.forEach((c) => learned.add(c));
        expect(group.words.length).toBeGreaterThanOrEqual(4);
        expect(group.words.length).toBeLessThanOrEqual(8);
        for (const { word } of group.words) {
          const letters = [...stripStress(word).toLowerCase()];
          expect(letters.length, word).toBeGreaterThanOrEqual(2);
          expect(letters.length, word).toBeLessThanOrEqual(7);
          for (const c of letters) expect(learned.has(c), `${word} (${group.id})`).toBe(true);
        }
      }
    });

    it("uses each reading word once", () => {
      const words = alphabet.groups.flatMap((g) => g.words.map((w) => stripStress(w.word)));
      expect(new Set(words).size).toBe(words.length);
    });
  });
});

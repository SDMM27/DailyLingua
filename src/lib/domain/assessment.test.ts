import { describe, expect, it } from "vitest";
import { countWords } from "./assessment";

describe("countWords", () => {
  it("counts Russian words, not punctuation", () => {
    expect(countWords("Меня зовут Анна. Я живу в Москве!", "ru")).toBe(7);
  });

  it("counts Italian words and ignores empty text", () => {
    expect(countWords("Il gatto dorme sul divano.", "it")).toBe(5);
    expect(countWords("   ", "it")).toBe(0);
  });

  it("counts an Italian elision as one word (the segmenter keeps « l'amico » whole)", () => {
    // Observed with the runtime's ICU, not corrected: if it ever returns 2, limits are still fine.
    expect(countWords("l'amico", "it")).toBe(1);
    expect(countWords("Ho visto l'amico di Marco", "it")).toBe(5);
  });
});

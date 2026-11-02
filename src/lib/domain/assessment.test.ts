import { describe, expect, it } from "vitest";
import { canStartListening, countWords, decideComprehension, decideSpeaking, decideWriting, lowerLevel, LISTENING_MAX_PLAYS, receptionLevel } from "./assessment";

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

describe("canStartListening", () => {
  it("allows listenings until the maximum is reached", () => {
    expect(LISTENING_MAX_PLAYS).toBe(3);
    expect([0, 1, 2].map(canStartListening)).toEqual([true, true, true]);
    expect([3, 4].map(canStartListening)).toEqual([false, false]);
  });
});

describe("lowerLevel", () => {
  it("goes one level down, and stops at A1", () => {
    expect(lowerLevel("C2")).toBe("C1");
    expect(lowerLevel("B1")).toBe("A2");
    expect(lowerLevel("A2")).toBe("A1");
    expect(lowerLevel("A1")).toBe("A1");
  });
});

describe("decideComprehension", () => {
  const high = { level: "B1", confidence: "high", offerHigher: true };
  const low = { level: "A2", confidence: "low", offerHigher: false };
  const medium = { level: "B1", confidence: "medium", offerHigher: false };

  it("confirms the level from 2.5 points", () => {
    expect(decideComprehension("B1", ["correct", "correct", "correct"])).toEqual(high);
    expect(decideComprehension("B1", ["correct", "correct", "partial"])).toEqual(high); // 2.5
  });

  it("is uncertain between 1 and 2.5 (exclusive)", () => {
    expect(decideComprehension("B1", ["correct", "correct", "wrong"])).toEqual(medium); // 2
    expect(decideComprehension("B1", ["correct", "partial", "partial"])).toEqual(medium); // 2
    expect(decideComprehension("B1", ["correct", "partial", "wrong"])).toEqual(medium); // 1.5
  });

  it("lowers the level up to 1 point", () => {
    expect(decideComprehension("B1", ["correct", "wrong", "wrong"])).toEqual(low); // 1
    expect(decideComprehension("B1", ["partial", "partial", "wrong"])).toEqual(low); // 1
    expect(decideComprehension("B1", ["wrong", "wrong", "wrong"])).toEqual(low);
  });

  it("never goes below A1 and offers nothing higher at C2", () => {
    expect(decideComprehension("A1", ["wrong", "wrong", "wrong"])).toEqual({ level: "A1", confidence: "low", offerHigher: false });
    expect(decideComprehension("C2", ["correct", "correct", "correct"])).toEqual({ level: "C2", confidence: "high", offerHigher: false });
  });
});

describe("decideWriting", () => {
  it("confirms the level from a mean of 3.75", () => {
    expect(decideWriting("B2", [4, 4, 4, 3])).toEqual({ level: "B2", confidence: "high", offerHigher: true }); // 3.75
    expect(decideWriting("B2", [5, 5, 5, 5])).toMatchObject({ confidence: "high" });
  });

  it("is uncertain above 2 and below 3.75", () => {
    expect(decideWriting("B2", [4, 3, 4, 3])).toEqual({ level: "B2", confidence: "medium", offerHigher: false }); // 3.5
    expect(decideWriting("B2", [3, 2, 2, 2])).toMatchObject({ confidence: "medium" }); // 2.25
  });

  it("lowers the level up to a mean of 2", () => {
    expect(decideWriting("B2", [2, 2, 2, 2])).toEqual({ level: "B1", confidence: "low", offerHigher: false });
    expect(decideWriting("B2", [3, 2, 2, 1])).toMatchObject({ level: "B1", confidence: "low" }); // 2
  });

  it("never goes below A1 and offers nothing higher at C2", () => {
    expect(decideWriting("A1", [1, 1, 1, 1])).toEqual({ level: "A1", confidence: "low", offerHigher: false });
    expect(decideWriting("C2", [5, 5, 4, 5])).toEqual({ level: "C2", confidence: "high", offerHigher: false });
  });
});

describe("decideSpeaking", () => {
  const claims = [
    { id: "a", level: "A1" },
    { id: "b", level: "A2" },
    { id: "c", level: "B1" },
    { id: "d", level: "B1" },
  ] as const;

  it("takes the highest level whose statements up to it are all ticked", () => {
    expect(decideSpeaking([...claims], { a: true, b: true, c: true, d: true })).toEqual({ level: "B1", confidence: "low" });
    expect(decideSpeaking([...claims], { a: true, b: true, c: false, d: true })).toEqual({ level: "A2", confidence: "low" });
  });

  it("counts a missing answer as no, and none ticked as A1", () => {
    expect(decideSpeaking([...claims], { a: true, c: true })).toEqual({ level: "A1", confidence: "low" });
    expect(decideSpeaking([...claims], { a: false })).toEqual({ level: "A1", confidence: "low" });
  });

  it("is null without any answer", () => {
    expect(decideSpeaking([...claims], {})).toBeNull();
  });
});

describe("receptionLevel", () => {
  it("is the lowest of reading and listening", () => {
    expect(receptionLevel({ reading: { level: "B2" }, listening: { level: "B1" } })).toBe("B1");
    expect(receptionLevel({ reading: { level: "A2" }, listening: { level: "C1" } })).toBe("A2");
  });

  it("uses the only one assessed, or null", () => {
    expect(receptionLevel({ reading: null, listening: { level: "B1" } })).toBe("B1");
    expect(receptionLevel({ reading: { level: "B2" }, listening: null })).toBe("B2");
    expect(receptionLevel({ reading: null, listening: null })).toBeNull();
  });
});

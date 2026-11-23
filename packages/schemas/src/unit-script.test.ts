import { describe, expect, it } from "vitest";
import { CLEARED_VOICES, isScriptUnit, unitSchema } from "./index";

const l10n = (text: string) => ({ fr: `${text} fr`, en: `${text} en` });

function validScriptUnit() {
  const letter = (lower: string) => ({
    upper: lower.toUpperCase(), lower, latin: lower, name: lower, kind: "same" as const, lookalike: null,
    sound: l10n("sound"), example: { word: lower, translation: l10n("word"), audio: null },
  });
  const items = Array.from({ length: 10 }, (_, i) => ({
    id: `i${i + 1}`, kind: "mcq" as const, prompt: "а", options: [{ id: "a", text: "a" }, { id: "b", text: "o" }], answer: "a", audio: null, explain: l10n("why"),
  }));
  const ids = items.map((item) => item.id);
  return {
    id: "ru-a0-01-lettres-1",
    language: "ru",
    level: "A0" as const,
    order: 1,
    kind: "script" as const,
    title: l10n("Lettres"),
    situation: l10n("Situation"),
    minutes: 12,
    canDo: [{ id: "c1", text: l10n("one") }, { id: "c2", text: l10n("two") }],
    voice: CLEARED_VOICES[0],
    letters: ["а", "к", "м", "о"].map(letter),
    words: Array.from({ length: 8 }, (_, i) => ({ id: `w${i + 1}`, text: "мак", latin: "mak", translation: l10n("pavot"), audio: null })),
    items,
    lessons: [
      { id: "l1" as const, steps: [{ step: "letters" as const, itemIds: ids.slice(0, 3), threshold: 0.6 }, { step: "sounds" as const, itemIds: ids.slice(3, 5), threshold: 0.6 }] },
      { id: "l2" as const, steps: [{ step: "words" as const, itemIds: ids.slice(5, 7), threshold: 0.6 }, { step: "reading" as const, itemIds: ids.slice(7), threshold: 0.6 }] },
      { id: "l3" as const, steps: [{ step: "test" as const, itemIds: ids, threshold: 0 }] },
    ],
    test: { itemIds: ids, passScore: 8 as const },
    aiReview: null,
  };
}

describe("writing unit (kind script)", () => {
  it("accepts a complete writing unit and narrows with isScriptUnit", () => {
    const parsed = unitSchema.parse(validScriptUnit());
    expect(isScriptUnit(parsed)).toBe(true);
    expect(parsed.status).toBe("draft");
  });

  it("refuses the situation fields, a level other than A0 and a missing voice", () => {
    const unit = validScriptUnit();
    expect(unitSchema.safeParse({ ...unit, keyPhrases: [] }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, level: "A1" }).success).toBe(false);
    const withoutVoice = Object.fromEntries(Object.entries(unit).filter(([key]) => key !== "voice"));
    expect(unitSchema.safeParse(withoutVoice).success).toBe(false);
  });

  it("bounds the letters (4 to 8) and the words (8 to 14)", () => {
    const unit = validScriptUnit();
    expect(unitSchema.safeParse({ ...unit, letters: unit.letters.slice(0, 3) }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, letters: [...unit.letters, ...unit.letters, ...unit.letters] }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, words: unit.words.slice(0, 7) }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, words: [...unit.words, ...unit.words] }).success).toBe(false);
  });

  it("requires both languages for a letter sound and a word translation", () => {
    const unit = validScriptUnit();
    const letters = unit.letters.map((letter, i) => (i === 0 ? { ...letter, sound: { fr: "son" } } : letter));
    expect(unitSchema.safeParse({ ...unit, letters }).success).toBe(false);
    const words = unit.words.map((word, i) => (i === 0 ? { ...word, translation: { fr: "pavot", en: "" } } : word));
    expect(unitSchema.safeParse({ ...unit, words }).success).toBe(false);
  });

  it("needs an AI review once reviewed, and refuses a situation unit without its dialogue", () => {
    expect(unitSchema.safeParse({ ...validScriptUnit(), status: "reviewed" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...validScriptUnit(), kind: "situation" }).success).toBe(false);
  });
});

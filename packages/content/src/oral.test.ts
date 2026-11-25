import { MAX_ORAL_SENTENCE_ID_CHARS, oralSentenceSchema } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { getOralSentence, oralSentences } from "./oral";
import { UNITS, unitsFor } from "./units";

const LANGUAGES = [...new Set(Object.values(UNITS).map((unit) => unit.language))];

describe("oralSentences", () => {
  it("serves italian and russian, and nothing for a language without a unit", () => {
    expect(oralSentences("it").length).toBeGreaterThan(20);
    expect(oralSentences("ru").length).toBeGreaterThan(20);
    expect(oralSentences("xx")).toEqual([]);
  });

  it.each(LANGUAGES)("%s: unique ids within the limit, valid shape, an audio each, in order", (language) => {
    for (const options of [{}, { includeDrafts: true }]) {
      const found = oralSentences(language, options);
      expect(new Set(found.map((sentence) => sentence.id)).size).toBe(found.length);
      for (const sentence of found) {
        expect(oralSentenceSchema.safeParse(sentence).success, sentence.id).toBe(true);
        expect(sentence.id.length).toBeLessThanOrEqual(MAX_ORAL_SENTENCE_ID_CHARS);
        expect(sentence.audio).toBeTruthy();
        expect(sentence.language).toBe(language);
      }
      const orders = found.map((sentence) => sentence.unitOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it("takes situation units only: never a writing unit nor a bilan", () => {
    for (const language of LANGUAGES) {
      const kinds = new Set(oralSentences(language, { includeDrafts: true }).map((sentence) => UNITS[sentence.unitId]?.kind));
      expect([...kinds]).toEqual(["situation"]);
    }
  });

  it("serves published units only unless drafts are included", () => {
    for (const language of LANGUAGES) {
      for (const sentence of oralSentences(language)) expect(UNITS[sentence.unitId]?.status).toBe("published");
      expect(oralSentences(language, { includeDrafts: true }).length).toBeGreaterThanOrEqual(oralSentences(language).length);
    }
  });

  it("drops a sentence already seen once normalised: a key phrase that repeats a line appears once", () => {
    for (const language of LANGUAGES) {
      const found = oralSentences(language, { includeDrafts: true });
      const texts = found.map((sentence) => sentence.text.toLowerCase().replace(/[.!?…]+$/u, ""));
      expect(new Set(texts).size).toBe(texts.length);
    }
    // Key phrases that repeat a line of their unit (or of another) are dropped: fewer sentences than texts with an audio.
    const published = unitsFor("it").filter((unit) => unit.kind === "situation" && unit.status === "published");
    const raw = published.reduce((total, unit) => total + (unit.kind === "situation" ? unit.dialogue.lines.length + unit.keyPhrases.length : 0), 0);
    expect(oralSentences("it").length).toBeLessThan(raw);
  });

  it("gives the version of its unit, a translation in both languages and a word count", () => {
    const sentence = oralSentences("it")[0]!;
    expect(sentence.unitVersion).toBe(UNITS[sentence.unitId]?.version);
    expect(sentence.translation.fr).not.toBe("");
    expect(sentence.translation.en).not.toBe("");
    expect(sentence.words).toBeGreaterThanOrEqual(1);
  });
});

describe("getOralSentence", () => {
  it("finds a served sentence by id", () => {
    const sentence = oralSentences("ru")[3]!;
    expect(getOralSentence(sentence.id)).toEqual(sentence);
  });

  it("returns null for an unknown unit, an unknown sentence, a malformed id and a script unit", () => {
    expect(getOralSentence("xx-a1-01-nope#l1")).toBeNull();
    expect(getOralSentence("it-a1-01-saluer#nope")).toBeNull();
    expect(getOralSentence("garbage")).toBeNull();
    expect(getOralSentence("")).toBeNull();
    expect(getOralSentence("__proto__#x")).toBeNull();
    const script = Object.values(UNITS).find((unit) => unit.kind === "script");
    if (script) expect(getOralSentence(`${script.id}#l1`, { includeDrafts: true })).toBeNull();
  });

  it("hides a draft unless drafts are included", () => {
    const draft = Object.values(UNITS).find((unit) => unit.kind === "situation" && unit.status !== "published");
    if (!draft) return;
    const id = oralSentences(draft.language, { includeDrafts: true }).find((sentence) => sentence.unitId === draft.id)?.id;
    if (!id) return;
    expect(getOralSentence(id)).toBeNull();
    expect(getOralSentence(id, { includeDrafts: true })?.id).toBe(id);
  });
});

import type { OralSentence } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { currentUnitIdOf, isAtLeastA2, lastAttemptBySentence, selectOralSentences, toPacketSentence } from "./select-oral";

const unitId = (n: number) => `it-a1-${String(n).padStart(2, "0")}-unite`;

/** `count` sentences of unit `n`, `words` words each, ids `<unit>#s<i>`. */
const unit = (n: number, count: number, words = 4): OralSentence[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${unitId(n)}#s${i + 1}`,
    unitId: unitId(n),
    unitVersion: "0123456789ab",
    unitOrder: n,
    language: "it",
    text: `Frase ${n}.${i + 1}`,
    translation: { fr: `Phrase ${n}.${i + 1}`, en: `Sentence ${n}.${i + 1}` },
    audio: `audio/${n}-${i + 1}.mp3`,
    words,
  }));

const ids = (sentences: readonly OralSentence[]) => sentences.map((sentence) => sentence.id);
const base = { startedUnitIds: [] as string[], currentUnitId: null as string | null, atLeastA2: false, lastAttemptAt: new Map<string, string>() };

describe("selectOralSentences", () => {
  it("takes 6 sentences to say and the next 3 to dictate, in path order for a learner who never practised", () => {
    const all = [...unit(1, 5), ...unit(2, 5)];
    const { sentences, dictation } = selectOralSentences({ ...base, sentences: all, startedUnitIds: [unitId(1), unitId(2)] });
    expect(ids(sentences)).toEqual(ids(all).slice(0, 6));
    expect(ids(dictation)).toEqual(ids(all).slice(6, 9));
  });

  it("works from the units the learner opened plus the current one, and no other", () => {
    const all = [...unit(1, 4), ...unit(2, 4), ...unit(3, 4), ...unit(4, 4)];
    const { sentences, dictation } = selectOralSentences({ ...base, sentences: all, startedUnitIds: [unitId(1)], currentUnitId: unitId(3) });
    const used = new Set([...sentences, ...dictation].map((sentence) => sentence.unitId));
    expect([...used].sort()).toEqual([unitId(1), unitId(3)]);
    expect(sentences).toHaveLength(6);
    expect(dictation).toHaveLength(3);
  });

  it("puts first what was never worked on, then what was worked on longest ago", () => {
    const all = unit(1, 9);
    const lastAttemptAt = new Map([
      [`${unitId(1)}#s1`, "2026-11-20T09:00:00Z"],
      [`${unitId(1)}#s2`, "2026-11-10T09:00:00Z"],
      [`${unitId(1)}#s3`, "2026-11-25T09:00:00Z"],
    ]);
    const { sentences, dictation } = selectOralSentences({ ...base, sentences: all, startedUnitIds: [unitId(1)], lastAttemptAt });
    expect(ids(sentences)).toEqual(["s4", "s5", "s6", "s7", "s8", "s9"].map((id) => `${unitId(1)}#${id}`));
    expect(ids(dictation)).toEqual(["s2", "s1", "s3"].map((id) => `${unitId(1)}#${id}`));
  });

  it("leaves out a sentence of more than 12 words", () => {
    const all = [...unit(1, 3, 13), ...unit(1, 4, 12).map((sentence) => ({ ...sentence, id: `${sentence.id}b` }))];
    const { sentences, dictation } = selectOralSentences({ ...base, sentences: all, startedUnitIds: [unitId(1)] });
    expect([...sentences, ...dictation].every((sentence) => sentence.words <= 12)).toBe(true);
    expect(sentences).toHaveLength(4);
  });

  it("dictates the first sentences again when fewer than 9 exist, each once", () => {
    const all = unit(1, 7);
    const { sentences, dictation } = selectOralSentences({ ...base, sentences: all, startedUnitIds: [unitId(1)] });
    expect(sentences).toHaveLength(6);
    expect(ids(dictation)).toEqual([`${unitId(1)}#s7`, `${unitId(1)}#s1`, `${unitId(1)}#s2`]);
    const few = selectOralSentences({ ...base, sentences: unit(1, 2), startedUnitIds: [unitId(1)] });
    expect(few.sentences).toHaveLength(2);
    expect(ids(few.dictation)).toEqual(ids(few.sentences));
  });

  it("falls back to the first unit for a beginner without progress, and to every unit from A2", () => {
    const all = [...unit(1, 3), ...unit(2, 3), ...unit(3, 3)];
    const beginner = selectOralSentences({ ...base, sentences: all });
    expect(new Set([...beginner.sentences, ...beginner.dictation].map((sentence) => sentence.unitId))).toEqual(new Set([unitId(1)]));
    const advanced = selectOralSentences({ ...base, sentences: all, atLeastA2: true });
    expect(advanced.sentences).toHaveLength(6);
    expect(new Set([...advanced.sentences, ...advanced.dictation].map((sentence) => sentence.unitId)).size).toBeGreaterThan(1);
  });

  it("falls back when the current unit has no sentence (a writing unit), and gives nothing for a language without sentence", () => {
    const all = unit(2, 4);
    const onWriting = selectOralSentences({ ...base, sentences: all, currentUnitId: "ru-a0-01-lettres-1" });
    expect(ids(onWriting.sentences)).toEqual(ids(all));
    expect(selectOralSentences({ ...base, sentences: [] })).toEqual({ sentences: [], dictation: [] });
  });
});

describe("helpers of the choice", () => {
  it("keeps the latest attempt of each sentence, whatever the activity", () => {
    const last = lastAttemptBySentence([
      { sentenceId: "a", occurredAt: "2026-11-20T09:00:00Z" },
      { sentenceId: "a", occurredAt: "2026-11-22T09:00:00Z" },
      { sentenceId: "a", occurredAt: "2026-11-21T09:00:00Z" },
      { sentenceId: "b", occurredAt: "2026-11-01T09:00:00Z" },
    ]);
    expect(Object.fromEntries(last)).toEqual({ a: "2026-11-22T09:00:00Z", b: "2026-11-01T09:00:00Z" });
  });

  it("names the current unit as the first one not passed, and none when all are", () => {
    expect(currentUnitIdOf(["u1", "u2", "u3"], new Set(["u1"]))).toBe("u2");
    expect(currentUnitIdOf(["u1", "u2"], new Set(["u2"]))).toBe("u1");
    expect(currentUnitIdOf(["u1"], new Set(["u1"]))).toBeNull();
    expect(currentUnitIdOf([], new Set())).toBeNull();
  });

  it("tells A2 and above from the beginner levels by the mean of the estimates", () => {
    expect(isAtLeastA2([])).toBe(false);
    expect(isAtLeastA2([{ levelValue: 0.5 }, { levelValue: 1.9 }])).toBe(false);
    expect(isAtLeastA2([{ levelValue: 2 }, { levelValue: 2.4 }])).toBe(true);
    expect(isAtLeastA2([{ levelValue: 3.5 }])).toBe(true);
  });

  it("serves a sentence with its translation in one language", () => {
    const [sentence] = unit(1, 1);
    expect(toPacketSentence(sentence as OralSentence, "fr")).toEqual({
      id: `${unitId(1)}#s1`, unitVersion: "0123456789ab", text: "Frase 1.1", translation: "Phrase 1.1", audio: "audio/1-1.mp3", words: 4,
    });
    expect(toPacketSentence(sentence as OralSentence, "en").translation).toBe("Sentence 1.1");
  });
});

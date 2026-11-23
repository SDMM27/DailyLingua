import { describe, expect, it } from "vitest";
import { CLEARED_VOICES, unitIdSchema, unitItemSchema, unitSchema, unitStepSchema, type UnitSource } from "./index";

const l10n = (text: string) => ({ fr: `${text} fr`, en: `${text} en` });

function validUnit(): UnitSource {
  const items = Array.from({ length: 10 }, (_, i) => ({
    id: `i${i + 1}`,
    kind: "mcq" as const,
    prompt: l10n("prompt"),
    options: [
      { id: "a", text: "ciao" },
      { id: "b", text: "grazie" },
    ],
    answer: "a",
    audio: null,
    explain: l10n("why"),
  }));
  const ids = items.map((item) => item.id);
  return {
    id: "it-a1-01-saluer",
    language: "it",
    level: "A1",
    order: 1,
    kind: "situation",
    title: l10n("Saluer"),
    situation: l10n("Situation"),
    minutes: 15,
    canDo: [
      { id: "c1", text: l10n("one") },
      { id: "c2", text: l10n("two") },
    ],
    grammarPointId: "it-a1-essere-avere",
    dialogue: {
      title: "Al bar",
      speakers: [
        { id: "s1", name: "Anna", voice: CLEARED_VOICES[2] },
        { id: "s2", name: "Marco", voice: CLEARED_VOICES[2] },
      ],
      lines: Array.from({ length: 6 }, (_, i) => ({
        id: `d${i + 1}`,
        speaker: i % 2 === 0 ? "s1" : "s2",
        text: "Ciao",
        translation: l10n("Salut"),
        audio: null,
      })),
      audio: null,
      glosses: [{ form: "ciao", lemma: "ciao", meaning: l10n("salut"), note: null, isNew: true }],
    },
    keyPhrases: Array.from({ length: 6 }, (_, i) => ({
      id: `k${i + 1}`,
      text: "Ciao",
      translation: l10n("Salut"),
      lineId: null,
      audio: null,
    })),
    grammar: { summary: l10n("sum"), itemIds: ["i1", "i2"] },
    items,
    lessons: (["l1", "l2", "l3"] as const).map((id) => ({
      id,
      steps: [{ step: "exercises" as const, itemIds: ids.slice(0, 3), threshold: 0.6 }],
    })),
    test: { itemIds: ids, passScore: 8 },
    conversation: { turns: [{ id: "t1", speaker: "s1", text: "Ciao", translation: l10n("Salut"), audio: null, itemId: null }] },
    aiReview: null,
  };
}

describe("unitIdSchema", () => {
  it("accepts language-level-number-slug", () => {
    for (const id of ["it-a1-01-saluer", "ru-a0-02-lettres-1", "ru-a1-10-ab"]) {
      expect(unitIdSchema.safeParse(id).success, id).toBe(true);
    }
  });

  it("refuses other shapes", () => {
    for (const bad of ["it-a2-01-saluer", "it-a1-1-saluer", "ita-a1-01-saluer", "it-a1-01-s", "IT-a1-01-saluer", "it-a1-01-Saluer"]) {
      expect(unitIdSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe("unitStepSchema", () => {
  it("knows the lesson and writing steps", () => {
    for (const step of ["dialogue", "key_phrases", "grammar", "exercises", "conversation", "test", "letters", "sounds", "words", "reading"]) {
      expect(unitStepSchema.safeParse(step).success, step).toBe(true);
    }
    expect(unitStepSchema.safeParse("video").success).toBe(false);
  });
});

describe("unitItemSchema", () => {
  const options = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
  ];

  it("accepts one item of each kind", () => {
    const base = { id: "x", explain: l10n("e") };
    const items = [
      { ...base, kind: "mcq", prompt: "q", options, answer: "a", audio: null },
      { ...base, kind: "listen_mcq", prompt: l10n("q"), options, answer: "a", audio: "it/x.mp3", audioText: "Ciao" },
      { ...base, kind: "order", prompt: l10n("q"), tokens: ["io", "sono"], distractors: [], answer: "io sono", accept: [] },
      { ...base, kind: "cloze", before: "Io", after: "Anna", accept: ["sono"], hint: null },
      { ...base, kind: "type", prompt: l10n("q"), accept: ["ciao"] },
      { ...base, kind: "match", pairs: [1, 2, 3].map((n) => ({ left: `l${n}`, right: l10n(`r${n}`) })) },
    ];
    for (const item of items) expect(unitItemSchema.safeParse(item).success, item.kind).toBe(true);
  });

  it("requires audio on a listening item and keeps the bounds", () => {
    const mcq = { id: "x", explain: l10n("e"), prompt: "q", options, answer: "a" };
    expect(unitItemSchema.safeParse({ ...mcq, kind: "listen_mcq", audio: null, audioText: "Ciao" }).success).toBe(false);
    expect(unitItemSchema.safeParse({ ...mcq, kind: "mcq", audio: null, options: [options[0]] }).success).toBe(false);
    const order = { id: "x", kind: "order", prompt: l10n("q"), tokens: ["a"], distractors: [], answer: "a", accept: [], explain: l10n("e") };
    expect(unitItemSchema.safeParse(order).success).toBe(false);
    const match = { id: "x", kind: "match", pairs: [{ left: "a", right: l10n("a") }], explain: l10n("e") };
    expect(unitItemSchema.safeParse(match).success).toBe(false);
    const cloze = { id: "x", kind: "cloze", before: "", after: "", accept: [], hint: null, explain: l10n("e") };
    expect(unitItemSchema.safeParse(cloze).success).toBe(false);
  });

  it("requires the audio text of a listening item", () => {
    const listen = { id: "x", explain: l10n("e"), kind: "listen_mcq", prompt: "q", options, answer: "a", audio: "it/x.mp3" };
    expect(unitItemSchema.safeParse(listen).success).toBe(false);
    expect(unitItemSchema.safeParse({ ...listen, audioText: "" }).success).toBe(false);
    expect(unitItemSchema.safeParse({ ...listen, audioText: "Ciao" }).success).toBe(true);
  });

  it("refuses unknown fields and unknown kinds", () => {
    const typed = { id: "x", kind: "type", prompt: l10n("q"), accept: ["a"], explain: l10n("e") };
    expect(unitItemSchema.safeParse({ ...typed, score: 1 }).success).toBe(false);
    expect(unitItemSchema.safeParse({ id: "x", kind: "speak" }).success).toBe(false);
  });
});

describe("unitSchema", () => {
  it("accepts a complete unit", () => {
    expect(unitSchema.safeParse(validUnit()).success).toBe(true);
  });

  it("requires both languages everywhere", () => {
    const unit = validUnit();
    expect(unitSchema.safeParse({ ...unit, title: { fr: "Saluer" } }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, title: { fr: "Saluer", en: "" } }).success).toBe(false);
  });

  it("requires two speakers, 3 lessons, 10 test items and a pass score of 8", () => {
    const unit = validUnit();
    const oneSpeaker = { ...unit.dialogue, speakers: unit.dialogue.speakers.slice(0, 1) };
    expect(unitSchema.safeParse({ ...unit, dialogue: oneSpeaker }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, lessons: unit.lessons.slice(0, 2) }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, test: { ...unit.test, itemIds: unit.test.itemIds.slice(0, 9) } }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, test: { ...unit.test, passScore: 7 } }).success).toBe(false);
  });

  it("bounds the can-do list, the lines and the key phrases", () => {
    const unit = validUnit();
    expect(unitSchema.safeParse({ ...unit, canDo: unit.canDo.slice(0, 1) }).success).toBe(false);
    const fewLines = { ...unit.dialogue, lines: unit.dialogue.lines.slice(0, 5) };
    expect(unitSchema.safeParse({ ...unit, dialogue: fewLines }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, keyPhrases: unit.keyPhrases.slice(0, 5) }).success).toBe(false);
  });

  it("accepts an AI review and refuses a human one", () => {
    const unit = validUnit();
    const review = { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" };
    expect(unitSchema.safeParse({ ...unit, aiReview: review }).success).toBe(true);
    expect(unitSchema.safeParse({ ...unit, aiReview: { ...review, human: true } }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, aiReview: { ...review, reviewedOn: "24/11/2026" } }).success).toBe(false);
  });

  it("defaults the transliteration of lines and turns to null and accepts a text", () => {
    const unit = validUnit();
    const parsed = unitSchema.parse(unit);
    expect(parsed.dialogue.lines.every((line) => line.transliteration === null)).toBe(true);
    expect(parsed.conversation.turns[0]?.transliteration).toBeNull();
    const line = { ...unit.dialogue.lines[0]!, transliteration: "privet" };
    const turn = { ...unit.conversation.turns[0]!, transliteration: "privet" };
    const withText = { ...unit, dialogue: { ...unit.dialogue, lines: [line, ...unit.dialogue.lines.slice(1)] }, conversation: { turns: [turn] } };
    const out = unitSchema.parse(withText);
    expect(out.dialogue.lines[0]?.transliteration).toBe("privet");
    expect(out.conversation.turns[0]?.transliteration).toBe("privet");
    expect(unitSchema.safeParse({ ...unit, dialogue: { ...unit.dialogue, lines: [{ ...line, transliteration: "" }, ...unit.dialogue.lines.slice(1)] } }).success).toBe(false);
  });

  it("refuses a `version` in the source and a level outside A0-A1", () => {
    const unit = validUnit();
    expect(unitSchema.safeParse({ ...unit, version: "0123456789ab" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, level: "A2" }).success).toBe(false);
  });
});

describe("CLEARED_VOICES", () => {
  it("lists the three cleared voices", () => {
    expect([...CLEARED_VOICES]).toEqual(["ru_RU-denis-medium", "ru_RU-dmitri-medium", "it_IT-paola-medium"]);
  });
});

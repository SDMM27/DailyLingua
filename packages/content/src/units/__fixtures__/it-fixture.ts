import type { SituationUnitSource } from "@dailylingua/schemas";

const l10n = (fr: string, en = fr) => ({ fr, en });

/** The audio file the fixture points at; tests tell `audioExists` about it. */
export const FIXTURE_AUDIO = "it/it-a1-01-fixture/i2.mp3";

/** A small valid unit (italian): every invariant of `checkUnit` holds. Tests break one thing at a time. */
export function fixtureUnit(): SituationUnitSource {
  const explain = l10n("Explication", "Explanation");
  const line = (n: number, speaker: string, text: string) => ({
    id: `d${n}`,
    speaker,
    text,
    translation: l10n(`traduction ${n}`, `translation ${n}`),
    audio: null,
  });
  const phrase = (n: number, text: string, lineId: string | null) => ({
    id: `k${n}`,
    text,
    translation: l10n(`phrase ${n}`, `phrase ${n} en`),
    lineId,
    audio: null,
  });
  const options = [
    { id: "a", text: "Salut" },
    { id: "b", text: "Merci" },
  ];
  return {
    id: "it-a1-01-fixture",
    language: "it",
    level: "A1",
    order: 1,
    kind: "situation",
    title: l10n("Saluer", "Greeting"),
    situation: l10n("Tu rencontres quelqu'un.", "You meet someone."),
    minutes: 15,
    canDo: [
      { id: "c1", text: l10n("Saluer", "Greet") },
      { id: "c2", text: l10n("Dire son nom", "Say your name") },
    ],
    grammarPointId: "it-a1-essere-avere",
    dialogue: {
      title: "Al bar",
      speakers: [
        { id: "anna", name: "Anna", voice: "it-IT-ElsaNeural" },
        { id: "marco", name: "Marco", voice: "it-IT-ElsaNeural" },
      ],
      lines: [
        line(1, "anna", "Ciao, come ti chiami?"),
        line(2, "marco", "Mi chiamo Marco. E tu?"),
        line(3, "anna", "Io sono Anna."),
        line(4, "marco", "Piacere, Anna!"),
        line(5, "anna", "Piacere!"),
        line(6, "marco", "Di dove sei?"),
      ],
      audio: null,
      glosses: [
        { form: "ciao", lemma: "ciao", meaning: l10n("salut"), note: null, isNew: true },
        { form: "piacere", lemma: "piacere", meaning: l10n("enchanté"), note: l10n("Se dit en se rencontrant."), isNew: false },
      ],
    },
    keyPhrases: [
      phrase(1, "Ciao", "d1"),
      phrase(2, "Come ti chiami?", "d1"),
      phrase(3, "Mi chiamo Marco", "d2"),
      phrase(4, "Io sono Anna", "d3"),
      phrase(5, "Piacere", "d5"),
      phrase(6, "Di dove sei?", null),
    ],
    grammar: { summary: l10n("Essere : io sono, tu sei."), itemIds: ["i4", "i9"] },
    items: [
      { id: "i1", kind: "mcq", prompt: "Ciao", options, answer: "a", audio: null, explain },
      {
        id: "i2",
        kind: "listen_mcq",
        prompt: l10n("Que dit Anna ?", "What does Anna say?"),
        options,
        answer: "a",
        audio: FIXTURE_AUDIO,
        audioText: "Ciao",
        explain,
      },
      {
        id: "i3",
        kind: "order",
        prompt: l10n("Remets dans l'ordre", "Put in order"),
        tokens: ["Come", "ti", "chiami"],
        distractors: [],
        answer: "Come ti chiami?",
        accept: [],
        explain,
      },
      { id: "i4", kind: "cloze", before: "Io", after: "Anna.", accept: ["sono"], hint: null, explain },
      { id: "i5", kind: "type", prompt: l10n("Dis « enchanté »", "Say 'nice to meet you'"), accept: ["Piacere"], explain },
      {
        id: "i6",
        kind: "match",
        pairs: [
          { left: "ciao", right: l10n("salut", "hi") },
          { left: "piacere", right: l10n("enchanté", "nice to meet you") },
          { left: "tu", right: l10n("toi", "you") },
        ],
        explain,
      },
      { id: "i7", kind: "mcq", prompt: "Piacere", options, answer: "b", audio: null, explain },
      {
        id: "i8",
        kind: "order",
        prompt: l10n("Remets dans l'ordre", "Put in order"),
        tokens: ["Mi", "chiamo", "Marco"],
        distractors: ["Anna"],
        answer: "Mi chiamo Marco",
        accept: [],
        explain,
      },
      { id: "i9", kind: "cloze", before: "Mi", after: "Marco.", accept: ["chiamo"], hint: l10n("chiamarsi"), explain },
      { id: "i10", kind: "type", prompt: l10n("Dis « salut »", "Say 'hi'"), accept: ["Ciao"], explain },
    ],
    lessons: [
      {
        id: "l1",
        steps: [
          { step: "dialogue", itemIds: ["i1", "i2"], threshold: 0 },
          { step: "key_phrases", itemIds: ["i5", "i10"], threshold: 1 },
          { step: "exercises", itemIds: ["i3", "i7"], threshold: 0.6 },
        ],
      },
      {
        id: "l2",
        steps: [
          { step: "grammar", itemIds: ["i4", "i9"], threshold: 0.5 },
          { step: "exercises", itemIds: ["i6", "i8"], threshold: 0.6 },
        ],
      },
      {
        id: "l3",
        steps: [
          { step: "conversation", itemIds: ["i1"], threshold: 1 },
          { step: "test", itemIds: [], threshold: 0 },
        ],
      },
    ],
    test: { itemIds: ["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10"], passScore: 8 },
    conversation: {
      turns: [
        { id: "t1", speaker: "anna", text: "Ciao!", translation: l10n("Salut !"), audio: null, itemId: null },
        { id: "t2", speaker: "marco", text: "Come ti chiami?", translation: l10n("Comment tu t'appelles ?"), audio: null, itemId: "i1" },
      ],
    },
    aiReview: null,
  };
}

import type { DateKey, ScriptUnit, SituationUnit } from "@dailylingua/schemas";
import type { RawEvent, IngestState, StateCard, StateCorrection, StateItem, StateSession, StateText } from "./types";

/** Fixtures of the ingest tests: a state with one daily session and helpers to write events. */
export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const USER = uuid(1);
export const DEVICE = uuid(900);
export const NOW = new Date("2026-11-12T12:00:00.000Z");
export const TODAY: DateKey = "2026-11-12";
export const SESSION = uuid(10);
export const TEXT = uuid(20);

export const iso = (time: string, day = TODAY) => `${day}T${time}.000Z`;

export function words(prefix: string, count: number): string {
  return Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(" ");
}

export function emptyState(overrides: Partial<IngestState> = {}): IngestState {
  return {
    userId: USER,
    profile: { timeZone: "Europe/Paris", createdAt: "2026-10-01T00:00:00.000Z", writingLevels: { it: "B1" }, answerTolerance: "lenient", defaultRingTier: 15, explanationLanguage: "fr" },
    sessions: {},
    items: {},
    texts: {},
    cards: {},
    corrections: {},
    productions: {},
    days: {},
    learningDays: {},
    settingChanges: [],
    timezoneChanges: [],
    deviceCursors: {},
    streak: null,
    textReads: [],
    catchUpDays: [],
    knownEvents: {},
    cardFronts: [],
    rewriteChecks: {},
    recentProductionTexts: [],
    unitProgress: {},
    units: {},
    unitAttempts: {},
    unitTestIds: [],
    ...overrides,
  };
}

export function card(id: string, extra: Partial<StateCard> = {}): StateCard {
  return {
    id,
    userId: USER,
    language: "it",
    kind: "word",
    state: "review",
    stability: 5,
    difficulty: 5,
    dueAt: "2026-10-30T10:00:00.000Z",
    lastReviewAt: "2026-10-20T10:00:00.000Z",
    reps: 3,
    lapses: 0,
    lastReview: null,
    optionId: "ok",
    accept: [],
    servedAt: null,
    ...extra,
  };
}

export function session(extra: Partial<StateSession> = {}): StateSession {
  return {
    id: SESSION,
    userId: USER,
    language: "it",
    day: TODAY,
    kind: "daily",
    format: 15,
    status: "planned",
    servedAt: null,
    startedAt: null,
    completedAt: null,
    requiredSteps: ["wake", "reading", "workshop", "expression", "momentum"],
    wakeCardIds: [],
    wakeBudgetMinutes: 3,
    errorItemId: null,
    readingTextId: TEXT,
    readingItemIds: [],
    workshopItemIds: [],
    momentumWords: 180,
    rewriteSentences: 2,
    steps: {},
    ...extra,
  };
}

export function text(extra: Partial<StateText> = {}): StateText {
  return { id: TEXT, language: "it", wordCount: 300, body: words("testo", 300), readingEarnedDay: null, referenceWpm: null, ...extra };
}

export function item(id: string, extra: Partial<StateItem> = {}): StateItem {
  return { id, language: "it", textId: TEXT, kind: "mcq", answer: "a", accept: [], listeningOnly: false, origin: "text", errorItemId: null, reworkedDay: null, card: null, ...extra };
}

export function correction(id: string, productionId: string, extra: Partial<StateCorrection> = {}): StateCorrection {
  return { id, productionId, sessionId: SESSION, language: "it", detectedLanguage: "it", nativeVersion: words("nativo", 70), sentences: [], ...extra };
}

/** Writes events of one device with a rising counter and a fresh id each. */
export function eventWriter(start = 100, device = DEVICE, tz = "Europe/Paris") {
  let n = start;
  let seq = 0;
  return (kind: string, at: string, payload: Record<string, unknown>): RawEvent => {
    n++;
    seq++;
    return { clientEventId: uuid(n), kind, occurredAt: at, payload: { tz, deviceId: device, seq, ...payload } };
  };
}

export const review = (ev: ReturnType<typeof eventWriter>, cardId: string, at: string, answer = "ok", gapMs = 3000, mode = "recognition"): RawEvent => {
  const answered = Date.parse(at);
  return ev("review_attempt", at, { cardId, mode, answer, shownAt: new Date(answered - gapMs).toISOString(), answeredAt: at, audioPlays: 0 });
};

export const UNIT_ID = "it-a1-01-saluer";
export const UNIT_VERSION = "0123456789ab";

/** A published Italian unit whose items are all choices answered "a": l1 has 8 items, l2 12, l3 4; the test is q1-q10. */
export function unit(extra: Partial<SituationUnit> = {}): SituationUnit {
  const l10n = (text: string) => ({ fr: `${text} (fr)`, en: `${text} (en)` });
  const ids = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `q${from + i}`);
  const lines = Array.from({ length: 6 }, (_, i) => ({ id: `d${i + 1}`, speaker: i % 2 === 0 ? "s1" : "s2", text: `Battuta ${i + 1}`, transliteration: null, translation: l10n(`Line ${i + 1}`), audio: null }));
  return {
    id: UNIT_ID,
    version: UNIT_VERSION,
    language: "it",
    level: "A1",
    order: 1,
    kind: "situation",
    title: l10n("Saluer"),
    situation: l10n("Situation"),
    minutes: 15,
    canDo: [{ id: "c1", text: l10n("Can 1") }, { id: "c2", text: l10n("Can 2") }],
    grammarPointId: null,
    dialogue: { title: "Ciao", speakers: [{ id: "s1", name: "Anna", voice: "it_IT-paola-medium" }, { id: "s2", name: "Marco", voice: "it_IT-paola-medium" }], lines, audio: null, glosses: [] },
    keyPhrases: Array.from({ length: 6 }, (_, i) => ({ id: `k${i + 1}`, text: `Frase ${i + 1}`, translation: l10n(`Phrase ${i + 1}`), lineId: i < 2 ? `d${i + 1}` : null, audio: null })),
    grammar: null,
    items: ids(1, 24).map((id) => ({ id, kind: "mcq" as const, prompt: "?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: "a", audio: null, explain: l10n("Because") })),
    lessons: [
      { id: "l1", steps: [{ step: "dialogue", itemIds: ids(1, 2), threshold: 0 }, { step: "key_phrases", itemIds: ids(3, 4), threshold: 1 }, { step: "exercises", itemIds: ids(5, 8), threshold: 0.6 }] },
      { id: "l2", steps: [{ step: "exercises", itemIds: ids(9, 20), threshold: 0.6 }] },
      { id: "l3", steps: [{ step: "exercises", itemIds: ids(21, 24), threshold: 0.6 }] },
    ],
    test: { itemIds: ids(1, 10), passScore: 8 },
    conversation: { turns: [{ id: "t1", speaker: "s1", text: "Ciao", transliteration: null, translation: l10n("Hi"), audio: null, itemId: null }] },
    aiReview: { reviewedOn: "2026-11-20", passes: 2, arbiter: "arbitre-relecture" },
    status: "published",
    ...extra,
  };
}

export const SCRIPT_UNIT_ID = "ru-a0-01-lettres-1";

/** A published writing unit (no dialogue, no key phrases): l1 letters q1-q2 and sounds q3-q4, l2 words q5-q6 and reading q7-q8, test q1-q10. */
export function scriptUnit(): ScriptUnit {
  const l10n = (text: string) => ({ fr: `${text} (fr)`, en: `${text} (en)` });
  const ids = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `q${from + i}`);
  const letter = (lower: string, latin: string) => ({
    upper: lower.toUpperCase(), lower, latin, name: lower, kind: "same" as const, lookalike: null, sound: l10n("Son"),
    example: { word: lower, translation: l10n("Mot"), audio: null },
  });
  return {
    id: SCRIPT_UNIT_ID,
    version: UNIT_VERSION,
    language: "ru",
    level: "A0",
    order: 1,
    kind: "script",
    title: l10n("Lettres"),
    situation: l10n("Situation"),
    minutes: 12,
    canDo: [{ id: "c1", text: l10n("Can 1") }, { id: "c2", text: l10n("Can 2") }],
    voice: "ru_RU-denis-medium",
    letters: [letter("а", "a"), letter("к", "k"), letter("м", "m"), letter("о", "o")],
    words: Array.from({ length: 8 }, (_, i) => ({ id: `w${i + 1}`, text: "мак", latin: "mak", translation: l10n("Pavot"), audio: null })),
    items: ids(1, 10).map((id) => ({ id, kind: "mcq" as const, prompt: "а", options: [{ id: "a", text: "a" }, { id: "b", text: "o" }], answer: "a", audio: null, explain: l10n("Because") })),
    lessons: [
      { id: "l1", steps: [{ step: "letters", itemIds: ids(1, 2), threshold: 0.6 }, { step: "sounds", itemIds: ids(3, 4), threshold: 0.6 }] },
      { id: "l2", steps: [{ step: "words", itemIds: ids(5, 6), threshold: 0.6 }, { step: "reading", itemIds: ids(7, 8), threshold: 0.6 }] },
      { id: "l3", steps: [{ step: "test", itemIds: ids(1, 10), threshold: 0 }] },
    ],
    test: { itemIds: ids(1, 10), passScore: 8 },
    aiReview: { reviewedOn: "2026-11-20", passes: 2, arbiter: "arbitre-relecture" },
    status: "published",
  };
}

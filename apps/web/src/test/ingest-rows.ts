import type { CardRow, IngestRows, ItemRow, SessionRow } from "@dailylingua/data";
import type { StoredSessionPlan } from "@dailylingua/schemas";

/** Rows of the ingest tests: one learner (Italian, format 15) with a session of the day, a text, items and cards. */
export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const USER = uuid(1);
export const OTHER = uuid(2);
export const DEVICE = uuid(900);
export const NOW = new Date("2026-11-18T12:00:00.000Z");
export const TODAY = "2026-11-18";
export const SESSION = uuid(10);
export const TEXT = uuid(20);
export const CARD = (n: number) => uuid(100 + n);
export const ITEM = (n: number) => uuid(200 + n);

export function plan(overrides: Partial<StoredSessionPlan> = {}): StoredSessionPlan {
  return {
    v: 1,
    steps: [
      { step: "wake", minutes: 3, required: true },
      { step: "reading", minutes: 4.5, required: true },
      { step: "workshop", minutes: 2, required: true },
      { step: "expression", minutes: 4, required: true },
      { step: "momentum", minutes: 1.5, required: true },
    ],
    requiredSteps: ["wake", "reading", "workshop", "expression", "momentum"],
    wake: { cardIds: [CARD(1), CARD(2)], newCardIds: [], budgetMinutes: 3, errorItemId: null },
    reading: { textId: TEXT, itemIds: [ITEM(1), ITEM(2), ITEM(3)] },
    workshop: { itemIds: [ITEM(11)] },
    momentumWords: 180,
    rewriteSentences: 2,
    servedCards: { [CARD(1)]: "recognition", [CARD(2)]: "production" },
    resumption: false,
    newCardsSuspendedThrough: null,
    ...overrides,
  };
}

export function sessionRow(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: SESSION,
    userId: USER,
    language: "it",
    day: TODAY,
    kind: "daily",
    format: 15,
    status: "planned",
    servedAt: "2026-11-18T07:00:00+00:00",
    startedAt: null,
    completedAt: null,
    plan: plan(),
    steps: [],
    ...overrides,
  };
}

export function cardRow(n: number, overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: CARD(n),
    userId: USER,
    language: "it",
    kind: "word",
    state: "review",
    stability: 2,
    difficulty: 5,
    dueAt: "2026-11-18T06:00:00+00:00",
    lastReviewAt: "2026-11-16T06:00:00+00:00",
    reps: 3,
    lapses: 0,
    front: `parola${n}`,
    back: `mot${n}`,
    backLanguage: "fr",
    context: null,
    payload: {},
    lastReview: { reviewedAt: "2026-11-16T06:00:00+00:00", rating: 3 },
    ...overrides,
  };
}

export function itemRow(n: number, overrides: Partial<ItemRow> = {}): ItemRow {
  return { id: ITEM(n), textId: TEXT, step: n < 10 ? "reading" : "workshop", kind: "mcq", position: n, prompt: {}, listeningOnly: false, key: { answer: "a", accept: [] }, ...overrides };
}

export function rows(overrides: Partial<IngestRows> = {}): IngestRows {
  return {
    profile: { timeZone: "Europe/Paris", createdAt: "2026-10-01T00:00:00+00:00", gameSettings: {} },
    enrollments: [{ language: "it", dailyMinutes: 15 }],
    skillEstimates: [{ language: "it", skill: "writing", levelValue: 3.5 }],
    sessions: [sessionRow()],
    items: [itemRow(1), itemRow(2), itemRow(3, { listeningOnly: true }), itemRow(11, { step: "workshop", kind: "cloze", key: { answer: "casa", accept: ["la casa"] } })],
    texts: [{ id: TEXT, language: "it", wordCount: 60, body: "Testo di prova." }],
    cards: [cardRow(1), cardRow(2, { stability: 5 })],
    learningDays: [],
    settingChanges: [],
    timezoneChanges: [],
    deviceCursors: [],
    streak: { timeZoneChangedAt: null },
    textReads: [],
    knownEvents: {},
    cardFronts: [],
    recentProductionTexts: [],
    productions: [],
    ingestState: { seq: 0, memo: {} },
    ...overrides,
  };
}

import type { DateKey } from "@dailylingua/schemas";
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
    profile: { timeZone: "Europe/Paris", createdAt: "2026-10-01T00:00:00.000Z", writingLevels: { it: "B1" }, answerTolerance: "lenient", defaultRingTier: 15 },
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

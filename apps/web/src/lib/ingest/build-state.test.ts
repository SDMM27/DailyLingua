import { describe, expect, it } from "vitest";
import { CARD, ITEM, OTHER, SESSION, TEXT, USER, cardRow, itemRow, plan, rows, sessionRow, uuid } from "@/test/ingest-rows";
import { buildIngestState, writingLevels } from "./build-state";

describe("buildIngestState: profile", () => {
  it("takes the zone, the writing level (A0/A1 become A2, C2 becomes C1), the tolerance and the ring tier", () => {
    const { state } = buildIngestState({
      userId: USER,
      rows: rows({
        profile: { timeZone: "Asia/Tokyo", createdAt: "2026-10-01T00:00:00+00:00", gameSettings: { answerTolerance: { accents: "strict" } } },
        enrollments: [{ language: "it", dailyMinutes: 22 }],
        skillEstimates: [
          { language: "it", skill: "writing", levelValue: 1.2 },
          { language: "es", skill: "writing", levelValue: 6.8 },
          { language: "de", skill: "reading", levelValue: 3.5 },
          { language: "de", skill: "listening", levelValue: 4.5 },
        ],
      }),
      memo: null,
    });
    expect(state.profile).toEqual({ timeZone: "Asia/Tokyo", createdAt: "2026-10-01T00:00:00+00:00", writingLevels: { it: "A2", es: "C1", de: "B2" }, answerTolerance: "strict", defaultRingTier: 20, explanationLanguage: "en", enrolledLanguages: ["it"] });
  });

  it("defaults to a lenient tolerance and a 15 minute ring, and omits a language without an estimate", () => {
    const { state } = buildIngestState({ userId: USER, rows: rows({ enrollments: [], skillEstimates: [] }), memo: null });
    expect(state.profile.answerTolerance).toBe("lenient");
    expect(state.profile.defaultRingTier).toBe(15);
    expect(state.profile.writingLevels).toEqual({});
    expect(writingLevels([{ language: "it", skill: "speaking", levelValue: 2.5 }])).toEqual({ it: "A2" });
  });
});

describe("buildIngestState: sessions", () => {
  it("builds the session of the user from its row and its stored plan, with its steps", () => {
    const { state, skippedSessions } = buildIngestState({
      userId: USER,
      rows: rows({ sessions: [sessionRow({ steps: [{ step: "wake", validatedAt: "2026-11-18T08:00:00+00:00", proof: { answered: [CARD(1)] } }, { step: "review", validatedAt: null, proof: {} }] })] }),
      memo: null,
    });
    expect(skippedSessions).toEqual([]);
    expect(state.sessions[SESSION]).toMatchObject({
      id: SESSION,
      userId: USER,
      language: "it",
      kind: "daily",
      format: 15,
      status: "planned",
      servedAt: "2026-11-18T07:00:00+00:00",
      requiredSteps: ["wake", "reading", "workshop", "expression", "momentum"],
      wakeCardIds: [CARD(1), CARD(2)],
      wakeBudgetMinutes: 3,
      errorItemId: null,
      readingTextId: TEXT,
      readingItemIds: [ITEM(1), ITEM(2), ITEM(3)],
      workshopItemIds: [ITEM(11)],
      momentumWords: 180,
      rewriteSentences: 2,
    });
    // The Bilan (`review`) is a screen, not a step to validate.
    expect(state.sessions[SESSION]?.steps).toEqual({ wake: { validatedAt: "2026-11-18T08:00:00+00:00", proof: { answered: [CARD(1)] } } });
  });

  it("leaves out a session whose plan cannot be read, and says which", () => {
    const { state, skippedSessions } = buildIngestState({ userId: USER, rows: rows({ sessions: [sessionRow({ plan: { v: 1 } }), sessionRow({ id: uuid(11), plan: plan() })] }), memo: null });
    expect(skippedSessions).toEqual([SESSION]);
    expect(Object.keys(state.sessions)).toEqual([uuid(11)]);
  });

  it("keeps a foreign session as foreign, with nothing of its plan", () => {
    const { state } = buildIngestState({ userId: USER, rows: rows({ sessions: [sessionRow({ id: uuid(12), userId: OTHER, plan: plan() })] }), memo: null });
    expect(state.sessions[uuid(12)]).toMatchObject({ userId: OTHER, readingTextId: null, readingItemIds: [], wakeCardIds: [], requiredSteps: [] });
  });
});

describe("buildIngestState: items and texts", () => {
  it("gives an mcq its right option and the others their written forms, the canonical answer included", () => {
    const { state } = buildIngestState({ userId: USER, rows: rows(), memo: null });
    expect(state.items[ITEM(1)]).toMatchObject({ kind: "mcq", answer: "a", accept: [], language: "it", textId: TEXT, listeningOnly: false, origin: "text", errorItemId: null, card: null });
    expect(state.items[ITEM(3)]?.listeningOnly).toBe(true);
    expect(state.items[ITEM(11)]).toMatchObject({ kind: "cloze", answer: null, accept: ["casa", "la casa"] });
  });

  it("reads the card an item becomes from prompt.card, and nothing from a malformed one", () => {
    const card = { kind: "word", front: "casa", back: "maison", backLanguage: "fr", context: null };
    const { state } = buildIngestState({
      userId: USER,
      rows: rows({ items: [itemRow(11, { prompt: { card } }), itemRow(12, { prompt: { card: { kind: "word" } } }), itemRow(13, { prompt: "nope" as unknown as object })] }),
      memo: null,
    });
    expect(state.items[ITEM(11)]?.card).toEqual(card);
    expect(state.items[ITEM(12)]?.card).toBeNull();
    expect(state.items[ITEM(13)]?.card).toBeNull();
  });

  it("skips an item of an unknown kind, and carries the reading state of a text from the memo", () => {
    const { state } = buildIngestState({
      userId: USER,
      rows: rows({ items: [itemRow(1, { kind: "essay" })] }),
      memo: { v: 1, days: {}, texts: { [TEXT]: { readingEarnedDay: "2026-11-17", referenceWpm: 180 } }, productions: {}, catchUpDays: [] },
    });
    expect(state.items).toEqual({});
    expect(state.texts[TEXT]).toEqual({ id: TEXT, language: "it", wordCount: 60, body: "Testo di prova.", readingEarnedDay: "2026-11-17", referenceWpm: 180 });
  });
});

describe("buildIngestState: cards", () => {
  it("keys a card by the mode it was served in: a choice by its id, a typed answer by its forms", () => {
    const { state, cardModes } = buildIngestState({ userId: USER, rows: rows({ cards: [cardRow(1), cardRow(2, { stability: 5, payload: { accept: ["mot 2"] } })] }), memo: null });
    expect(cardModes.get(CARD(1))).toBe("recognition");
    expect(cardModes.get(CARD(2))).toBe("production");
    expect(state.cards[CARD(1)]).toMatchObject({ optionId: CARD(1), accept: [], servedAt: "2026-11-18T07:00:00+00:00", userId: USER });
    expect(state.cards[CARD(2)]).toMatchObject({ optionId: null, accept: ["parola2", "mot 2"] });
  });

  it("uses the mode of the packet even when the stability would now give another", () => {
    // Served as a choice, stability since grown to 20 days: the key stays the option id until a new packet changes it.
    const { cardModes } = buildIngestState({ userId: USER, rows: rows({ cards: [cardRow(1, { stability: 20 })] }), memo: null });
    expect(cardModes.get(CARD(1))).toBe("recognition");
  });

  it("falls back to the variant of core for a card no packet holds, and has no served instant", () => {
    const { state, cardModes } = buildIngestState({ userId: USER, rows: rows({ cards: [cardRow(7, { stability: 8 })] }), memo: null });
    expect(cardModes.get(CARD(7))).toBe("production");
    expect(state.cards[CARD(7)]?.servedAt).toBeNull();
  });

  it("takes the served instant from the most recent session that holds the card", () => {
    const older = sessionRow({ id: uuid(30), day: "2026-11-17", servedAt: "2026-11-17T07:00:00+00:00", plan: plan({ servedCards: { [CARD(1)]: "production" } }) });
    const newer = sessionRow({ id: uuid(31), day: "2026-11-18", servedAt: "2026-11-18T09:00:00+00:00", plan: plan({ servedCards: { [CARD(1)]: "recognition" } }) });
    const { state, cardModes } = buildIngestState({ userId: USER, rows: rows({ sessions: [older, newer], cards: [cardRow(1)] }), memo: null });
    expect(state.cards[CARD(1)]?.servedAt).toBe("2026-11-18T09:00:00+00:00");
    expect(cardModes.get(CARD(1))).toBe("recognition");
  });

  it("turns the last review into a learning day and a rating, and keeps a card of another user as theirs", () => {
    const { state } = buildIngestState({
      userId: USER,
      rows: rows({ cards: [cardRow(1, { lastReview: { reviewedAt: "2026-11-17T23:30:00+00:00", rating: 1 } }), cardRow(9, { userId: OTHER, lastReview: null })] }),
      memo: null,
    });
    expect(state.cards[CARD(1)]?.lastReview).toEqual({ day: "2026-11-17", rating: 1 });
    expect(state.cards[CARD(9)]).toMatchObject({ userId: OTHER, lastReview: null });
  });
});

describe("buildIngestState: journals and memo", () => {
  it("copies the journals, the memo counters, the events known and the corrections left empty until PR 3", () => {
    const day = { xpByReason: { "review.recognition": 2 }, reviewSuccesses: 1, newCards: 1, readingTexts: 0, rewards: {}, focusBySession: {}, rewardsByCorrection: {}, counted: [`review:${CARD(1)}`] };
    const { state } = buildIngestState({
      userId: USER,
      rows: rows({
        learningDays: [{ day: "2026-11-17", timeZone: "Europe/Paris", xpVerified: 90, validated: true, cause: "work", firstActivityAt: null }],
        settingChanges: [{ key: "ring.tier", value: 20, effectiveDay: "2026-11-02", changedAt: "2026-11-01T10:00:00+00:00" }, { key: "surprise", value: 1, effectiveDay: "2026-11-02", changedAt: "2026-11-01T10:00:00+00:00" }],
        timezoneChanges: [{ effectiveAt: "2026-10-01T00:00:00+00:00", timeZone: "Europe/Paris" }],
        deviceCursors: [{ deviceId: uuid(900), lastSeq: 7, lastDay: "2026-11-17" }],
        textReads: [TEXT],
        knownEvents: { [uuid(77)]: null },
        cardFronts: ["it|word|casa"],
        recentProductionTexts: [{ id: uuid(78), text: "Ciao" }],
      }),
      memo: { v: 1, days: { "2026-11-18": day }, texts: {}, productions: {}, catchUpDays: ["2026-11-10"] },
    });
    expect(state.learningDays["2026-11-17"]).toEqual({ day: "2026-11-17", timeZone: "Europe/Paris", xpVerified: 90, validated: true, cause: "work", firstActivityAt: null });
    expect(state.settingChanges).toEqual([{ key: "ring.tier", value: 20, effectiveDay: "2026-11-02", changedAt: "2026-11-01T10:00:00+00:00" }]);
    expect(state.deviceCursors).toEqual({ [uuid(900)]: { lastSeq: 7, lastDay: "2026-11-17" } });
    expect(state.days["2026-11-18"]).toEqual(day);
    expect(state.catchUpDays).toEqual(["2026-11-10"]);
    expect(state.textReads).toEqual([TEXT]);
    expect(state.knownEvents).toEqual({ [uuid(77)]: null });
    expect(state.cardFronts).toEqual(["it|word|casa"]);
    expect(state.recentProductionTexts).toEqual([{ id: uuid(78), text: "Ciao" }]);
    expect(state.streak).toEqual({ timeZoneChangedAt: null });
    expect(state.corrections).toEqual({});
    expect(state.rewriteChecks).toEqual({});
  });

  it("takes the state of a production from the memo, and treats one the memo does not know as settled", () => {
    const base = { sessionId: SESSION, language: "it", text: "Ciao", clientEventId: uuid(60), createdAt: "2026-11-16T22:30:00+00:00" };
    const { state } = buildIngestState({
      userId: USER,
      rows: rows({ productions: [{ id: uuid(40), ...base }, { id: uuid(41), ...base, clientEventId: null }] }),
      memo: { v: 1, days: {}, texts: {}, productions: { [uuid(40)]: { day: "2026-11-16", late: true, settled: false, correctionDeferred: true } }, catchUpDays: [] },
    });
    expect(state.productions[uuid(40)]).toMatchObject({ day: "2026-11-16", late: true, settled: false, correctionDeferred: true, clientEventId: uuid(60) });
    expect(state.productions[uuid(41)]).toMatchObject({ day: "2026-11-16", late: false, settled: true, correctionDeferred: false, clientEventId: "" });
  });

  it("does not modify the rows it is given", () => {
    const input = rows();
    const copy = structuredClone(input);
    buildIngestState({ userId: USER, rows: input, memo: null });
    expect(input).toEqual(copy);
  });
});

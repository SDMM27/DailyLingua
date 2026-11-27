import type { CardRow, ErrorOfDayRow, ItemRow, NewSession, PacketTextRow, SessionRow, TextCandidate } from "@dailylingua/data";
import { sessionPacketSchema, storedSessionPlanSchema, type SessionPacket } from "@dailylingua/schemas";
import { describe, expect, it, vi } from "vitest";
import { CARD, ITEM, NOW, OTHER, TEXT, TODAY, USER, cardRow, itemRow, uuid } from "@/test/ingest-rows";
import { buildChoiceOptions } from "./options";
import { pickReadingItems, pickTextCandidate, pickWorkshopItems, planToday, servedMode } from "./plan-session";
import { suggestSpoken } from "./build-packet";
import { createTodayHandler, type TodayStore } from "./today-route";
import { sessionScreens } from "./session-flow";

const textRow: PacketTextRow = { id: TEXT, language: "it", levelBand: "B1", density: 2, theme: "voyage", title: "Un viaggio", body: "Testo di prova.", wordCount: 3, newWords: [{ word: "casa" }], grammarPoint: null, listeningSegment: { from: 0, to: 1 }, writingTask: "Racconta." };
const reading = (n: number, extra: Partial<ItemRow> = {}) => itemRow(n, { step: "reading", position: n, ...extra });
const workshop = (n: number) => itemRow(10 + n, { step: "workshop", position: n, key: { answer: "b", accept: [] } });
const items = [reading(0), reading(1), reading(2), reading(3, { listeningOnly: true }), reading(4), ...Array.from({ length: 8 }, (_, i) => workshop(i))];
// A pool of cards with distinct meanings, due before the learner's day starts.
const pool = (n: number, extra: Partial<CardRow> = {}): CardRow[] => Array.from({ length: n }, (_, i) => cardRow(i + 1, { dueAt: "2026-11-18T05:00:00+00:00", ...extra }));

describe("buildChoiceOptions", () => {
  const cards = pool(6);
  it("draws the right option and three others of the language, deterministically from the seed", () => {
    const a = buildChoiceOptions(cards[0]!, cards, "it", "session-1");
    const again = buildChoiceOptions(cards[0]!, cards, "it", "session-1");
    expect(a).toEqual(again);
    expect(a?.options).toHaveLength(4);
    expect(a?.correctOptionId).toBe(CARD(1));
    expect(a?.options.find((option) => option.id === CARD(1))?.text).toBe("mot1");
    expect(new Set(a?.options.map((option) => option.text)).size).toBe(4);
    expect(a?.options.map((option) => option.id)).not.toEqual(buildChoiceOptions(cards[0]!, cards, "it", "session-2")?.options.map((option) => option.id));
  });

  it("is null without a meaning or without three other distinct meanings in the language", () => {
    expect(buildChoiceOptions({ id: CARD(1), back: null }, cards, "it", "s")).toBeNull();
    expect(buildChoiceOptions({ id: CARD(1), back: "  " }, cards, "it", "s")).toBeNull();
    expect(buildChoiceOptions(cards[0]!, cards.slice(0, 3), "it", "s")).toBeNull();
    const same = cards.map((card) => ({ ...card, back: "pareil" }));
    expect(buildChoiceOptions(same[0]!, same, "it", "s")).toBeNull();
    expect(buildChoiceOptions(cards[0]!, cards, "es", "s")).toBeNull();
  });

  it("ignores a distractor that has the meaning of the card, whatever its case", () => {
    const withTwin = [...cards.slice(0, 4), cardRow(9, { back: "MOT1" })];
    const result = buildChoiceOptions(withTwin[0]!, withTwin, "it", "s");
    expect(result?.options.map((option) => option.id)).not.toContain(CARD(9));
  });
});

describe("text and item choice", () => {
  it("picks the candidate whose density is nearest 2, then the oldest, then by id", () => {
    const c = (id: string, density: number, createdAt: string): TextCandidate => ({ id, density, createdAt });
    expect(pickTextCandidate([c("b", 3, "2026-01-01"), c("a", 1, "2026-01-01")])?.id).toBe("a");
    expect(pickTextCandidate([c("b", 2, "2026-02-01"), c("a", 2, "2026-03-01"), c("c", 1, "2026-01-01")])?.id).toBe("b");
    expect(pickTextCandidate([c("b", 2, "2026-01-01"), c("a", 2, "2026-01-01")])?.id).toBe("a");
    expect(pickTextCandidate([])).toBeNull();
  });

  it("takes one listening-only question when the text has one, then the others by position", () => {
    expect(pickReadingItems(items, 3).map((item) => item.position)).toEqual([0, 1, 3]);
    expect(pickReadingItems(items, 4).map((item) => item.position)).toEqual([0, 1, 2, 3]);
    expect(pickReadingItems(items.filter((item) => !item.listeningOnly), 3).map((item) => item.position)).toEqual([0, 1, 2]);
    expect(pickReadingItems(items, 0)).toEqual([]);
    expect(pickWorkshopItems(items, 7).map((item) => item.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pickWorkshopItems(items, 0)).toEqual([]);
  });
});

describe("planToday", () => {
  const base = { now: NOW, today: TODAY, timeZone: "Europe/Paris", format: 15 as const, cards: pool(6), recentReviews: [], lastSessionDay: "2026-11-17", completedShortSessions: 0, newCardsToday: 0, newCardsSuspendedThrough: null, text: { text: textRow, items } };

  it("plans a daily session with the text, its reading questions and the workshop of the format", () => {
    const { kind, format, plan } = planToday(base, uuid(500));
    expect(kind).toBe("daily");
    expect(format).toBe(15);
    expect(storedSessionPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.reading.textId).toBe(TEXT);
    expect(plan.reading.itemIds).toHaveLength(4);
    // Format 15 asks for 9 workshop items; this text has 8.
    expect(plan.workshop.itemIds).toHaveLength(8);
    expect(plan.requiredSteps).toEqual(["wake", "reading", "workshop", "expression", "momentum"]);
    expect(plan.momentumWords).toBe(180);
    expect(plan.rewriteSentences).toBe(2);
    expect(plan.wake.cardIds).toHaveLength(6);
    // No answer key anywhere in what is stored.
    expect(JSON.stringify(plan)).not.toContain('"answer"');
  });

  it("is a review-only session, the Réveil alone, when no text is available (D6)", () => {
    const { kind, plan } = planToday({ ...base, text: null }, uuid(500));
    expect(kind).toBe("review_only");
    expect(plan.reading).toEqual({ textId: null, itemIds: [] });
    expect(plan.workshop.itemIds).toEqual([]);
    expect(plan.requiredSteps).toEqual(["wake"]);
    expect(plan.momentumWords).toBeNull();
    expect(plan.rewriteSentences).toBe(0);
  });

  it("alternates the workshop and the momentum at format 10 and stores the whole-text momentum as null", () => {
    const even = planToday({ ...base, format: 10, completedShortSessions: 0 }, uuid(500)).plan;
    expect(even.requiredSteps).toEqual(["wake", "reading", "workshop", "expression"]);
    expect(even.workshop.itemIds).toHaveLength(7);
    expect(even.momentumWords).toBeNull();
    const odd = planToday({ ...base, format: 10, completedShortSessions: 1 }, uuid(500)).plan;
    expect(odd.requiredSteps).toEqual(["wake", "reading", "expression", "momentum"]);
    expect(odd.workshop.itemIds).toEqual([]);
    expect(odd.momentumWords).toBe(120);
    expect(planToday({ ...base, format: 30 }, uuid(500)).plan.momentumWords).toBeNull();
  });

  it("serves the due cards of the next two days after the Réveil, never a suspended one, 120 at most", () => {
    const soon = pool(3, { dueAt: "2026-11-20T10:00:00+00:00" }).map((card, i) => ({ ...card, id: CARD(50 + i), front: `a${i}`, back: `b${i}` }));
    const late = cardRow(60, { dueAt: "2026-11-21T10:00:00+00:00", back: "tardi" });
    const suspended = cardRow(61, { state: "suspended", dueAt: "2026-11-18T05:00:00+00:00", back: "susp" });
    const { plan } = planToday({ ...base, cards: [...pool(6), ...soon, late, suspended] }, uuid(500));
    expect(Object.keys(plan.servedCards)).toEqual(expect.arrayContaining(soon.map((card) => card.id)));
    expect(plan.servedCards[late.id]).toBeUndefined();
    expect(plan.servedCards[suspended.id]).toBeUndefined();
    const many = Array.from({ length: 150 }, (_, i) => cardRow(1000 + i, { id: uuid(5000 + i), dueAt: "2026-11-19T10:00:00+00:00", front: `f${i}`, back: `b${i}` }));
    expect(Object.keys(planToday({ ...base, cards: many }, uuid(500)).plan.servedCards).length).toBeLessThanOrEqual(120);
  });

  it("serves a card as a choice only when four options can be drawn, else typed (the mode is stored)", () => {
    const cards = [cardRow(1, { stability: 1 }), cardRow(2, { stability: 1 }), cardRow(3, { stability: 1 })];
    expect(servedMode(cards[0]!, cards, "s")).toBe("production");
    const four = [...cards, cardRow(4, { stability: 1 })];
    expect(servedMode(four[0]!, four, "s")).toBe("recognition");
    expect(servedMode(cardRow(5, { stability: 9 }), four, "s")).toBe("production");
    const { plan } = planToday({ ...base, cards: cards.map((card) => ({ ...card, dueAt: "2026-11-18T05:00:00+00:00" })) }, uuid(500));
    expect(Object.values(plan.servedCards)).toEqual(["production", "production", "production"]);
  });

  it("marks a card missed yesterday for reconquest from the reviews of the day before", () => {
    const cards = pool(3);
    const missed = { cardId: CARD(3), rating: 1, reviewedAt: "2026-11-17T10:00:00+00:00" };
    const { plan } = planToday({ ...base, cards, recentReviews: [missed, { cardId: CARD(1), rating: 1, reviewedAt: "2026-11-16T10:00:00+00:00" }] }, uuid(500));
    // The card missed yesterday comes first in the Réveil.
    expect(plan.wake.cardIds[0]).toBe(CARD(3));
  });

  it("starts a resumption at format 10 with new cards suspended, after an absence", () => {
    const { format, plan } = planToday({ ...base, lastSessionDay: "2026-11-10" }, uuid(500));
    expect(format).toBe(10);
    expect(plan.resumption).toBe(true);
    expect(plan.newCardsSuspendedThrough).toBe("2026-11-19");
  });
});

// ------------------------------------------------------------------------------------------------ the route

function store(overrides: Partial<TodayStore> = {}) {
  const inserted: NewSession[] = [];
  const base: TodayStore = {
    profileAndEnrollments: async () => ({ profile: { timeZone: "Europe/Paris", createdAt: "2026-10-01T00:00:00+00:00", gameSettings: {} }, enrollments: [{ language: "it", dailyMinutes: 15 }] }),
    skillEstimates: async () => [{ language: "it", skill: "writing", levelValue: 3.5 }],
    sessionOfDay: async () => null,
    planningCards: async () => pool(6),
    pendingErrorOfDay: async () => null,
    errorOfDay: async () => null,
    recentReviews: async () => [],
    lastSessionDay: async () => "2026-11-17",
    lastSpokenProductionAt: async () => null,
    completedShortSessions: async () => 0,
    suspendedThrough: async () => null,
    ingestState: async () => ({ seq: 0, memo: {} }),
    textCandidates: async () => [{ id: TEXT, density: 2, createdAt: "2026-11-01T00:00:00+00:00" }],
    textWithItems: async () => ({ text: textRow, items }),
    quotaUsage: async () => ({ writing_feedback: 1, rewrite_check: 0 }),
    insertSession: async (session) => {
      inserted.push(session);
      return { id: session.id, userId: session.userId, language: session.language, day: session.day, kind: session.kind, format: session.format, status: "planned", servedAt: session.servedAt, startedAt: null, completedAt: null, plan: session.plan, steps: [] } satisfies SessionRow;
    },
  };
  return { store: { ...base, ...overrides }, inserted };
}

function handler(overrides: Partial<TodayStore> = {}, user: { id: string } | null = { id: USER }) {
  const s = store(overrides);
  const log = vi.fn();
  const get = createTodayHandler({ getUser: async () => user, store: s.store, now: () => NOW, newId: () => uuid(777), log });
  return { ...s, log, get: (language: string | null = "it", includeExpression = false) => {
    const suffix = language === null ? "" : `?language=${language}${includeExpression ? "&expression=1" : ""}`;
    return get(new Request(`https://app.example.test/api/session/today${suffix}`));
  } };
}

describe("GET /api/session/today", () => {
  it("answers 401 to a signed-out visitor", async () => {
    expect((await handler({}, null).get()).status).toBe(401);
  });

  it("answers 404 for a language that is not an active enrollment, or is not a language code", async () => {
    const h = handler();
    for (const language of ["es", "xx", "IT", "../x", "it,es", "", null]) expect((await h.get(language)).status, String(language)).toBe(404);
    expect(h.inserted).toEqual([]);
  });

  it("creates the session once and serves a packet that matches the schema, private and uncached, keys included", async () => {
    const h = handler();
    const response = await h.get();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const packet = sessionPacketSchema.parse(await response.json());
    expect(h.inserted).toHaveLength(1);
    expect(h.inserted[0]).toMatchObject({ id: uuid(777), userId: USER, language: "it", day: TODAY, kind: "daily", format: 15, servedAt: NOW.toISOString() });
    expect(packet.session).toEqual({ id: uuid(777), language: "it", day: TODAY, format: 15, kind: "daily", status: "planned", servedAt: NOW.toISOString() });
    expect(packet.text).toMatchObject({ id: TEXT, writingTask: "Racconta.", listeningSegment: { from: 0, to: 1 }, newWords: [{ word: "casa" }] });
    expect(packet.items.every((item) => item.key.answer !== null)).toBe(true);
    expect(packet.errorOfTheDay).toBeNull();
    expect(packet.quotas).toEqual({ writingFeedback: { used: 1, limit: 3 }, rewriteCheck: { used: 0, limit: 6 } });
    expect(packet.serverDay).toBe(TODAY);
    expect(packet.timeZone).toBe("Europe/Paris");
    expect(packet.steps.map((step) => step.step)).toEqual(["wake", "reading", "workshop", "expression", "momentum"]);
    expect(h.inserted[0]?.plan.servedCards).toEqual(Object.fromEntries(packet.cards.map((card) => [card.id, card.mode])));
  });

  it("suggests speaking only when no spoken production was sent in the last 7 learning days", async () => {
    const suggested = async (lastSpokenProductionAt: string | null) =>
      sessionPacketSchema.parse(await (await handler({ lastSpokenProductionAt: async () => lastSpokenProductionAt }).get("it", true)).json()).expression;
    expect(await suggested(null)).toEqual({ suggestSpoken: true });
    expect(await suggested("2026-11-13T10:00:00+00:00")).toEqual({ suggestSpoken: false });
    expect(await suggested("2026-11-11T10:00:00+00:00")).toEqual({ suggestSpoken: true });
  });

  it("keeps the legacy packet shape until the client opts into expression metadata", async () => {
    const lastSpokenProductionAt = vi.fn(async () => null);
    const response = await handler({ lastSpokenProductionAt }).get();
    expect(sessionPacketSchema.omit({ expression: true }).safeParse(await response.json()).success).toBe(true);
    expect(lastSpokenProductionAt).not.toHaveBeenCalled();
  });

  it("counts the learning days in the learner time zone, today included", () => {
    expect(suggestSpoken("2026-11-19T12:00:00Z", "2026-11-25", "Europe/Paris")).toBe(false); // 6 days ago
    expect(suggestSpoken("2026-11-18T12:00:00Z", "2026-11-25", "Europe/Paris")).toBe(true); // 7 days ago
    // 03:00 in Paris belongs to the previous learning day (the day changes at 04:00).
    expect(suggestSpoken("2026-11-19T02:00:00Z", "2026-11-25", "Europe/Paris")).toBe(true);
  });

  it("serves each choice card with four options that include the card itself, and typed cards with their forms", async () => {
    const cards = [...pool(5), cardRow(8, { stability: 9, payload: { accept: ["alt"] } })];
    const packet = sessionPacketSchema.parse(await (await handler({ planningCards: async () => cards }).get()).json());
    for (const card of packet.cards) {
      if (card.mode === "recognition") {
        expect(card.options).toHaveLength(4);
        expect(card.correctOptionId).toBe(card.id);
        expect(card.options.some((option) => option.id === card.id)).toBe(true);
        expect(card.accept).toEqual([]);
      } else {
        expect(card.options).toEqual([]);
        expect(card.correctOptionId).toBeNull();
        expect(card.accept).toContain(card.front);
      }
    }
    expect(packet.cards.find((card) => card.id === CARD(8))).toMatchObject({ mode: "production", accept: ["parola8", "alt"] });
  });

  it("serves the selected error first, with the verified passage, even on a review-only day", async () => {
    const error: ErrorOfDayRow = {
      id: uuid(801), correctionId: uuid(802), language: "it", createdDay: "2026-11-17", reworkedDay: null,
      sentence: "Io ho andato a Roma.", highlighted: "ho andato", explanation: "Avec l’auxiliaire essere.",
      explanationLanguage: "fr", sentenceIndex: 0, recurring: false, accept: ["sono andato", "sono arrivato"],
    };
    const pendingErrorOfDay = vi.fn(async () => error);
    const errorOfDay = vi.fn(async () => error);
    const h = handler({ pendingErrorOfDay, errorOfDay, textCandidates: async () => [] });
    const packet = sessionPacketSchema.parse(await (await h.get()).json());

    expect(pendingErrorOfDay).toHaveBeenCalledWith(USER, "it", "2026-11-11", TODAY);
    expect(errorOfDay).toHaveBeenCalledWith(USER, error.id);
    expect(h.inserted[0]?.plan.wake.errorItemId).toBe(error.id);
    expect(packet.errorOfTheDay).toMatchObject({ itemId: error.id, explanationLanguage: "fr", accept: error.accept });
    expect(sessionScreens(packet)[0]).toMatchObject({ key: error.id, kind: "error", step: "wake" });
  });

  it("is idempotent: an existing session is served again as it is stored, nothing is inserted", async () => {
    const first = handler();
    const created = (await (await first.get()).json()) as SessionPacket;
    const row: SessionRow = { id: uuid(777), userId: USER, language: "it", day: TODAY, kind: "daily", format: 15, status: "started", servedAt: NOW.toISOString(), startedAt: NOW.toISOString(), completedAt: null, plan: first.inserted[0]!.plan, steps: [] };
    const again = handler({ sessionOfDay: async () => row, textCandidates: async () => Promise.reject(new Error("not asked")) });
    const second = (await (await again.get()).json()) as SessionPacket;
    expect(again.inserted).toEqual([]);
    expect(second.session).toEqual({ ...created.session, status: "started" });
    expect(second.cards).toEqual(created.cards);
    expect(second.items).toEqual(created.items);
    expect(second.text).toEqual(created.text);
  });

  it("serves a review-only session without a text when nothing is available (D6)", async () => {
    const h = handler({ textCandidates: async () => [], textWithItems: async () => null });
    const packet = sessionPacketSchema.parse(await (await h.get()).json());
    expect(packet.session.kind).toBe("review_only");
    expect(packet.text).toBeNull();
    expect(packet.items).toEqual([]);
    expect(packet.steps.map((step) => step.step)).toEqual(["wake"]);
    expect(packet.cards.length).toBeGreaterThan(0);
    expect(h.inserted[0]?.kind).toBe("review_only");
  });

  it("serves the winner's session when another request inserted first (the row returned is the one used)", async () => {
    const winner: SessionRow = { id: uuid(888), userId: USER, language: "it", day: TODAY, kind: "daily", format: 15, status: "planned", servedAt: "2026-11-18T06:00:00+00:00", startedAt: null, completedAt: null, plan: planToday({ now: NOW, today: TODAY, timeZone: "Europe/Paris", format: 15, cards: pool(6), recentReviews: [], lastSessionDay: null, completedShortSessions: 0, newCardsToday: 0, newCardsSuspendedThrough: null, text: { text: textRow, items } }, uuid(888)).plan, steps: [] };
    const packet = (await (await handler({ insertSession: async () => winner }).get()).json()) as SessionPacket;
    expect(packet.session.id).toBe(uuid(888));
    expect(packet.session.servedAt).toBe("2026-11-18T06:00:00.000Z");
  });

  it("reads the new cards of today in the memo and the level band of the learner", async () => {
    const day = { xpByReason: {}, reviewSuccesses: 0, newCards: 9, readingTexts: 0, rewards: {}, focusBySession: {}, rewardsByCorrection: {}, counted: [] };
    const asked: string[][] = [];
    const h = handler({
      ingestState: async () => ({ seq: 1, memo: { v: 1, days: { [TODAY]: day }, texts: {}, productions: {}, catchUpDays: [] } }),
      planningCards: async () => pool(4).map((card) => ({ ...card, state: "new" as const, dueAt: "2026-11-01T00:00:00+00:00" })),
      textCandidates: async (_user, _language, bands) => {
        asked.push([...bands]);
        return [{ id: TEXT, density: 2, createdAt: "2026-11-01T00:00:00+00:00" }];
      },
    });
    const packet = sessionPacketSchema.parse(await (await h.get()).json());
    expect(asked).toEqual([["B1"]]);
    // The 9 new cards of a 15 minute day were already introduced: no new card enters the Réveil.
    expect(h.inserted[0]?.plan.wake.newCardIds).toEqual([]);
    expect(packet.cards).toEqual([]);
  });

  it("answers 503, saying nothing of the cause, when the database fails or the stored plan is unreadable", async () => {
    const failing = handler({ planningCards: async () => Promise.reject(new Error("relation app.card secret")) });
    const response = await failing.get();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
    expect(failing.log).toHaveBeenCalled();

    const broken = handler({ sessionOfDay: async () => ({ id: uuid(1), userId: USER, language: "it", day: TODAY, kind: "daily", format: 15, status: "planned", servedAt: null, startedAt: null, completedAt: null, plan: {}, steps: [] }) });
    expect((await broken.get()).status).toBe(503);
  });

  it("never serves a card of another learner, a deleted one or a suspended one", async () => {
    const cards = [...pool(5), cardRow(20, { state: "suspended", dueAt: "2026-11-18T05:00:00+00:00" })];
    const packet = sessionPacketSchema.parse(await (await handler({ planningCards: async () => cards }).get()).json());
    expect(packet.cards.map((card) => card.id)).not.toContain(CARD(20));
    expect(JSON.stringify(packet)).not.toContain(OTHER);
    expect(packet.items.map((item) => item.id)).toEqual(expect.arrayContaining([ITEM(1)]));
  });
});

describe("paid preparation of the shared reading", () => {
  const url = "https://app.example.test/api/session/today?language=it";
  const post = (origin = "https://app.example.test") => new Request(url, { method: "POST", headers: { Origin: origin } });

  it("only calls the generator for an authenticated same-origin POST without stock", async () => {
    const candidate = { id: TEXT, density: 2, createdAt: "2026-11-01T00:00:00+00:00" };
    const textCandidates = vi.fn<TodayStore["textCandidates"]>().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValue([candidate]);
    const fixture = store({ textCandidates });
    const prepareText = vi.fn(async () => "published" as const);
    const route = createTodayHandler({ getUser: async () => ({ id: USER }), store: fixture.store, now: () => NOW, newId: () => uuid(777), prepareText });
    expect((await route(post("https://other.example.test"))).status).toBe(403);
    expect((await route(new Request(url))).status).toBe(200);
    expect(prepareText).not.toHaveBeenCalled();
    const response = await route(post());
    expect(response.status).toBe(200);
    expect(prepareText).toHaveBeenCalledTimes(1);
    expect(sessionPacketSchema.parse(await response.json()).text?.id).toBe(TEXT);
  });

  it("leaves the session unplanned when another request is preparing the text", async () => {
    const fixture = store({ textCandidates: async () => [] });
    const route = createTodayHandler({ getUser: async () => ({ id: USER }), store: fixture.store, now: () => NOW, newId: () => uuid(777), prepareText: async () => "busy" });
    const response = await route(post());
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(fixture.inserted).toHaveLength(0);
  });
});

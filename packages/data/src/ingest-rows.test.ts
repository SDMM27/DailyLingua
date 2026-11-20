import { describe, expect, it } from "vitest";
import { DataError } from "./errors";
import { readIngestRows, type IngestRefs } from "./ingest-rows";
import { tableFake } from "./table-fake";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ME = ID(1);
const OTHER = ID(2);
const REFS: IngestRefs = { sessionIds: [], cardIds: [], textIds: [], productionIds: [], deviceIds: [], clientEventIds: [] };
const WINDOW = { from: "2026-11-10", to: "2026-11-19" };

const plan = (textId: string | null, reading: string[], workshop: string[]) => ({
  v: 1,
  steps: [{ step: "wake", minutes: 3, required: true }],
  requiredSteps: ["wake"],
  wake: { cardIds: [], newCardIds: [], budgetMinutes: 3, errorItemId: null },
  reading: { textId, itemIds: reading },
  workshop: { itemIds: workshop },
  momentumWords: null,
  rewriteSentences: 0,
  servedCards: {},
  resumption: false,
  newCardsSuspendedThrough: null,
});

const session = (id: string, userId: string, day: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: userId,
  language: "it",
  day,
  kind: "daily",
  format: 15,
  status: "planned",
  served_at: null,
  started_at: null,
  completed_at: null,
  plan: plan(ID(300), [ID(400)], [ID(401)]),
  ...extra,
});

const card = (id: string, userId: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: userId,
  language: "it",
  kind: "word",
  state: "review",
  stability: "4.5",
  difficulty: 5,
  due_at: "2026-11-18T08:00:00+00:00",
  last_review_at: "2026-11-15T08:00:00+00:00",
  reps: 3,
  lapses: 0,
  front: "Casa",
  back: "maison",
  back_language: "fr",
  context: null,
  payload: {},
  deleted_at: null,
  ...extra,
});

function tables() {
  return {
    profile: [{ user_id: ME, time_zone: "Europe/Paris", created_at: "2026-10-01T00:00:00+00:00", game_settings: {} }],
    enrollment: [
      { user_id: ME, language: "it", daily_minutes: 15, active: true, position: 0 },
      { user_id: ME, language: "es", daily_minutes: 10, active: false, position: 1 },
    ],
    skill_estimate: [{ user_id: ME, language: "it", skill: "writing", level_value: "3.50" }],
    session: [
      session(ID(10), ME, "2026-11-17"),
      session(ID(11), ME, "2026-10-01"),
      session(ID(12), OTHER, "2026-11-17"),
    ],
    session_step: [
      { session_id: ID(10), user_id: ME, step: "wake", validated_at: "2026-11-17T08:00:00+00:00", proof: { cards: 3 } },
      { session_id: ID(12), user_id: OTHER, step: "wake", validated_at: null, proof: {} },
    ],
    text_item: [
      { id: ID(400), text_id: ID(300), step: "reading", kind: "mcq", position: 0, prompt: { q: "?" }, listening_only: false },
      { id: ID(401), text_id: ID(300), step: "workshop", kind: "cloze", position: 0, prompt: {}, listening_only: false },
    ],
    text_item_key: [
      { item_id: ID(400), answer: "a", accept: [] },
      { item_id: ID(401), answer: null, accept: ["casa"] },
    ],
    text: [{ id: ID(300), language: "it", word_count: 120, body: "Testo." }],
    card: [card(ID(20), ME), card(ID(21), OTHER), card(ID(22), ME, { deleted_at: "2026-11-01T00:00:00+00:00" }), card(ID(23), ME, { front: "Mela", kind: "chunk" })],
    review_log: [
      { id: 1, user_id: ME, card_id: ID(20), rating: 1, reviewed_at: "2026-11-10T08:00:00+00:00" },
      { id: 2, user_id: ME, card_id: ID(20), rating: 3, reviewed_at: "2026-11-15T08:00:00+00:00", client_event_id: ID(90) },
    ],
    learning_day: [{ user_id: ME, day: "2026-11-16", time_zone: "Europe/Paris", xp_verified: 90, validated: true, cause: "work", first_activity_at: null }],
    setting_change: [{ id: 1, user_id: ME, key: "ring.tier", value: 20, effective_day: "2026-11-02", changed_at: "2026-11-01T10:00:00+00:00" }],
    timezone_change: [{ id: 1, user_id: ME, effective_at: "2026-10-01T00:00:00+00:00", time_zone: "Europe/Paris" }],
    device_cursor: [
      { user_id: ME, device_id: ID(500), last_seq: "7", last_day: "2026-11-16" },
      { user_id: OTHER, device_id: ID(500), last_seq: "99", last_day: "2026-11-16" },
    ],
    streak_state: [{ user_id: ME, time_zone_changed_at: null }],
    text_read: [{ user_id: ME, text_id: ID(300) }],
    ingest_event: [
      { user_id: ME, client_event_id: ID(91), fingerprint: "00112233445566778899aabbccddeeff" },
      { user_id: OTHER, client_event_id: ID(92), fingerprint: "ffeeddccbbaa99887766554433221100" },
    ],
    attempt: [],
    production: [
      { id: ID(600), user_id: ME, session_id: ID(10), language: "it", text: "Ciao a tutti", client_event_id: ID(93), created_at: "2026-11-16T10:00:00+00:00" },
    ],
    rewrite: [],
    ui_event: [{ user_id: ME, client_event_id: ID(94) }],
    ingest_state: [{ user_id: ME, seq: "4", memo: { v: 1 } }],
  };
}

describe("readIngestRows", () => {
  it("loads the error served in an owned session and only uses accepted rewrites of that sentence", async () => {
    const fixture = tables();
    const errorId = ID(710);
    const correctionId = ID(711);
    const storedPlan = plan(null, [], []);
    fixture.session = [session(ID(10), ME, "2026-11-17", {
      plan: { ...storedPlan, wake: { ...storedPlan.wake, errorItemId: errorId } },
    }), session(ID(12), OTHER, "2026-11-17", {
      plan: { ...storedPlan, wake: { ...storedPlan.wake, errorItemId: ID(720) } },
    })];
    const error = {
      id: errorId, user_id: ME, correction_id: correctionId, language: "it",
      created_day: "2026-11-16", reworked_day: null,
      prompt: {
        sentence: "Io ho andato a Roma.", highlighted: "ho andato", explanation: "Avec être.",
        explanationLanguage: "fr", sentenceIndex: 0, recurring: false,
      },
      answer: { accept: ["sono andato"] },
    };
    const attempt = { id: ID(730), user_id: ME, correction_id: correctionId, sentence_index: 0, accepted: true, created_at: "2026-11-16T10:00:00.000Z" };
    const { client, queries } = tableFake({
      ...fixture, error_item: [error, { ...error, id: ID(720), user_id: OTHER }],
      rewrite: [
        { ...attempt, text: "Io sono arrivato a Roma." },
        { ...attempt, id: ID(731), text: "Io ho vissuto a Roma.", accepted: false },
        { ...attempt, id: ID(732), text: "Io sono partito a Roma.", sentence_index: 1 },
        { ...attempt, id: ID(733), text: "Sono arrivato a Roma." },
      ],
    });

    const rows = await readIngestRows(client, ME, { ...REFS, sessionIds: [ID(12)] }, WINDOW);
    expect(rows.errorItems).toEqual([expect.objectContaining({ id: errorId, accept: ["sono andato", "sono arrivato"] })]);
    expect(queries.find(({ table }) => table === "error_item")?.chain).toContain(`eq("user_id","${ME}")`);
  });

  it("reads the user's window and the referenced sessions WITHOUT a user filter, and no steps for a foreign session", async () => {
    const { client, queries } = tableFake(tables());
    const rows = await readIngestRows(client, ME, { ...REFS, sessionIds: [ID(12), ID(11)] }, WINDOW);
    expect(rows.sessions.map((s) => s.id)).toEqual([ID(10), ID(11), ID(12)]);
    expect(rows.sessions.find((s) => s.id === ID(10))?.steps).toEqual([{ step: "wake", validatedAt: "2026-11-17T08:00:00+00:00", proof: { cards: 3 } }]);
    expect(rows.sessions.find((s) => s.id === ID(12))?.steps).toEqual([]);
    const referenced = queries.find((q) => q.table === "session" && q.chain.some((c) => c.startsWith("in(")));
    expect(referenced?.chain.some((c) => c.startsWith('eq("user_id"'))).toBe(false);
    const windowed = queries.find((q) => q.table === "session" && q.chain.some((c) => c.startsWith("gte(")));
    expect(windowed?.chain).toContain(`eq("user_id","${ME}")`);
    expect(windowed?.chain).toContain('gte("day","2026-11-10")');
    expect(windowed?.chain).toContain('lte("day","2026-11-19")');
  });

  it("reads the cards of the events without a user filter, drops deleted ones, and adds the last review of the user's own", async () => {
    const { client, queries } = tableFake(tables());
    const rows = await readIngestRows(client, ME, { ...REFS, cardIds: [ID(20), ID(21), ID(22)] }, WINDOW);
    expect(rows.cards.map((c) => c.id).sort()).toEqual([ID(20), ID(21)]);
    const own = rows.cards.find((c) => c.id === ID(20));
    expect(own?.userId).toBe(ME);
    expect(own?.stability).toBe(4.5);
    expect(own?.lastReview).toEqual({ reviewedAt: "2026-11-15T08:00:00+00:00", rating: 3 });
    expect(rows.cards.find((c) => c.id === ID(21))?.lastReview).toBeNull();
    const query = queries.find((q) => q.table === "card" && q.chain.some((c) => c.startsWith('in("id"')));
    expect(query?.chain.some((c) => c.startsWith('eq("user_id"'))).toBe(false);
    expect(query?.chain).toContain('is("deleted_at",null)');
  });

  it("reads the items of the stored plans with their keys, the texts and the reads", async () => {
    const { client } = tableFake(tables());
    const rows = await readIngestRows(client, ME, { ...REFS, textIds: [ID(300)] }, WINDOW);
    expect(rows.items.map((item) => [item.id, item.key])).toEqual([
      [ID(400), { answer: "a", accept: [] }],
      [ID(401), { answer: null, accept: ["casa"] }],
    ]);
    expect(rows.texts).toEqual([{ id: ID(300), language: "it", wordCount: 120, body: "Testo." }]);
    expect(rows.textReads).toEqual([ID(300)]);
  });

  it("ignores a stored plan it cannot read", async () => {
    const data = tables();
    data.session = [session(ID(10), ME, "2026-11-17", { plan: { garbage: true } })];
    const { client } = tableFake(data);
    const rows = await readIngestRows(client, ME, REFS, WINDOW);
    expect(rows.items).toEqual([]);
    expect(rows.texts).toEqual([]);
  });

  it("reads the whole journals of the user and the cursors of the devices asked for", async () => {
    const { client } = tableFake(tables());
    const rows = await readIngestRows(client, ME, { ...REFS, deviceIds: [ID(500)] }, WINDOW);
    expect(rows.learningDays).toEqual([{ day: "2026-11-16", timeZone: "Europe/Paris", xpVerified: 90, validated: true, cause: "work", firstActivityAt: null }]);
    expect(rows.settingChanges).toEqual([{ key: "ring.tier", value: 20, effectiveDay: "2026-11-02", changedAt: "2026-11-01T10:00:00+00:00" }]);
    expect(rows.timezoneChanges).toHaveLength(1);
    expect(rows.deviceCursors).toEqual([{ deviceId: ID(500), lastSeq: 7, lastDay: "2026-11-16" }]);
    expect(rows.streak).toEqual({ timeZoneChangedAt: null });
    expect(rows.ingestState).toEqual({ seq: 4, memo: { v: 1 } });
    expect(rows.profile).toEqual({ timeZone: "Europe/Paris", createdAt: "2026-10-01T00:00:00+00:00", gameSettings: {} });
    expect(rows.enrollments).toEqual([{ language: "it", dailyMinutes: 15 }]);
    expect(rows.skillEstimates).toEqual([{ language: "it", skill: "writing", levelValue: 3.5 }]);
  });

  it("knows the events already ingested: ledger fingerprints first, then the rows of their own, never another user's", async () => {
    const { client } = tableFake(tables());
    const rows = await readIngestRows(client, ME, { ...REFS, clientEventIds: [ID(90), ID(91), ID(92), ID(93), ID(94), ID(95)] }, WINDOW);
    expect(rows.knownEvents).toEqual({
      [ID(91)]: "00112233445566778899aabbccddeeff",
      [ID(90)]: null,
      [ID(93)]: null,
      [ID(94)]: null,
    });
  });

  it("lists the fronts of the user's cards in the languages read and the last productions", async () => {
    const { client } = tableFake(tables());
    const rows = await readIngestRows(client, ME, REFS, WINDOW);
    expect(rows.cardFronts.sort()).toEqual(["it|chunk|mela", "it|word|casa"]);
    expect(rows.recentProductionTexts).toEqual([{ id: ID(600), text: "Ciao a tutti" }]);
  });

  it("counts the productions of the user received in the last 24 hours only", async () => {
    const data = tables();
    data.production = [
      { id: ID(610), user_id: ME, session_id: ID(10), language: "it", text: "a", client_event_id: ID(95), created_at: "2026-11-18T08:00:00.000Z" },
      { id: ID(611), user_id: ME, session_id: ID(10), language: "it", text: "b", client_event_id: ID(96), created_at: "2026-11-17T13:00:00.000Z" },
      { id: ID(612), user_id: ME, session_id: ID(10), language: "it", text: "c", client_event_id: ID(97), created_at: "2026-11-17T11:00:00.000Z" },
      { id: ID(613), user_id: OTHER, session_id: ID(10), language: "it", text: "d", client_event_id: ID(98), created_at: "2026-11-18T08:00:00.000Z" },
    ];
    const { client } = tableFake(data);
    const rows = await readIngestRows(client, ME, REFS, WINDOW, new Date("2026-11-18T12:00:00.000Z"));
    expect(rows.recentProductionCount).toBe(2);
  });

  it("reads productions by id, for the user only", async () => {
    const { client } = tableFake(tables());
    const rows = await readIngestRows(client, ME, { ...REFS, productionIds: [ID(600), ID(601)] }, WINDOW);
    expect(rows.productions).toEqual([{ id: ID(600), sessionId: ID(10), language: "it", text: "Ciao a tutti", clientEventId: ID(93), createdAt: "2026-11-16T10:00:00+00:00" }]);
  });

  it("also reads the productions the memo holds the state of", async () => {
    const data = tables();
    data.ingest_state = [{ user_id: ME, seq: "4", memo: { v: 1, productions: { [ID(600)]: { day: "2026-11-16" }, "not-an-id": {} } } as never }];
    const { client } = tableFake(data);
    const rows = await readIngestRows(client, ME, REFS, (zone) => (zone === "Europe/Paris" ? WINDOW : { from: "x", to: "x" }));
    expect(rows.productions.map((p) => p.id)).toEqual([ID(600)]);
  });

  it("does not query per event: the number of queries does not grow with the refs", async () => {
    const few = tableFake(tables());
    await readIngestRows(few.client, ME, { ...REFS, cardIds: [ID(20)], clientEventIds: [ID(90)] }, WINDOW);
    const many = tableFake(tables());
    await readIngestRows(many.client, ME, { ...REFS, cardIds: [ID(20), ...Array.from({ length: 39 }, (_, i) => ID(1000 + i))], clientEventIds: Array.from({ length: 50 }, (_, i) => ID(2000 + i)) }, WINDOW);
    expect(many.queries.length).toBe(few.queries.length);
  });

  it("defaults a missing ingest_state and streak_state, and fails on a missing profile", async () => {
    const data = tables();
    data.ingest_state = [];
    data.streak_state = [];
    const { client } = tableFake(data);
    const rows = await readIngestRows(client, ME, REFS, WINDOW);
    expect(rows.ingestState).toEqual({ seq: 0, memo: {} });
    expect(rows.streak).toBeNull();
    data.profile = [];
    await expect(readIngestRows(tableFake(data).client, ME, REFS, WINDOW)).rejects.toBeInstanceOf(DataError);
  });
});

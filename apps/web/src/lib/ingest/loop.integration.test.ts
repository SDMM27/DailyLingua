import { createClient } from "@supabase/supabase-js";
import { learningDay } from "@dailylingua/core";
import { IngestBatchError, type AppClient, type AppDatabase } from "@dailylingua/data";
import { ingestMemoSchema, type SessionPacket } from "@dailylingua/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTodayHandler, createTodayStore } from "@/lib/session-packet/today-route";
import { createIngestStore, ingestEvents, type IngestStore } from "./ingest-events";

/**
 * The whole loop of lot W against the LOCAL Supabase stack, with the real data layer: the packet of the day, the events
 * of a session decided by `planIngest` and written by `app.ingest_batch`, the replay that writes nothing, a foreign
 * session, a refusal by the database (isolation) and a moved state (retry). Two throw-away users and one text, deleted
 * afterwards. Skipped without the local stack or its keys; never runs `supabase db reset`.
 */
for (const path of ["../../../../.env.local", "../../../.env.local"]) {
  try {
    process.loadEnvFile(path);
  } catch {
    // No .env.local here: variables may come from the shell, or the tests are skipped.
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isLocal(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

async function localStackIsUp(): Promise<boolean> {
  if (!isLocal(url) || !anonKey || !serviceKey) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

const stackIsUp = await localStackIsUp();
const DEVICE = crypto.randomUUID();
const body = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");

describe.skipIf(!stackIsUp)("the loop of lot W (local database, service role)", () => {
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const service = admin as unknown as AppClient;
  const app = () => admin!.schema("app");
  const runId = `${Date.now()}`;
  const userIds: string[] = [];
  const textIds: string[] = [];
  let alice = "";
  let bob = "";
  let packet: SessionPacket;
  let events: unknown[] = [];
  // The packet is served 5 minutes ago: the events below happen after it and are received now.
  const servedAt = new Date(Date.now() - 5 * 60_000);
  const at = (seconds: number) => new Date(servedAt.getTime() + seconds * 1000).toISOString();
  const now = new Date();
  let seq = 0;

  async function createUser(label: string): Promise<string> {
    const created = await admin!.auth.admin.createUser({ email: `loop-${label}-${runId}@test.invalid`, password: `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`, email_confirm: true });
    if (created.error) throw created.error;
    userIds.push(created.data.user.id);
    return created.data.user.id;
  }

  const handler = (userId: string | null, at_: Date) =>
    createTodayHandler({ getUser: async () => (userId ? { id: userId } : null), store: createTodayStore(service), now: () => at_, newId: () => crypto.randomUUID() });

  const payload = (extra: Record<string, unknown>) => ({ tz: "Europe/Paris", deviceId: DEVICE, seq: ++seq, ...extra });
  const event = (kind: string, seconds: number, extra: Record<string, unknown>, id = crypto.randomUUID()) => ({ clientEventId: id, kind, occurredAt: at(seconds), payload: payload(extra) });

  async function count(table: string, userId = alice, column = "user_id") {
    const result = await app().from(table as "card").select("*", { count: "exact", head: true }).eq(column as "user_id", userId);
    return result.count ?? 0;
  }

  async function snapshot() {
    return {
      xp: await count("xp_ledger"),
      reviews: await count("review_log"),
      attempts: await count("attempt"),
      days: await count("learning_day"),
      steps: await count("session_step"),
      reads: await count("text_read"),
      ledger: await count("ingest_event"),
      cards: await count("card"),
      ui: await count("ui_event"),
      seq: (await app().from("ingest_state").select("seq").eq("user_id", alice).single()).data?.seq,
    };
  }

  beforeAll(async () => {
    alice = await createUser("alice");
    bob = await createUser("bob");
    // Alice learns Italian, 10 minutes a day; her profile (Europe/Paris) comes from the signup trigger.
    expect((await app().from("enrollment").insert({ user_id: alice, language: "it", daily_minutes: 10, position: 0 })).error).toBeNull();
    // Five new cards: a recognition review needs the meanings of four cards.
    const cards = await app()
      .from("card")
      .insert(["casa:maison", "gatto:chat", "cane:chien", "libro:livre", "acqua:eau"].map((pair) => ({ user_id: alice, language: "it", kind: "word", front: pair.split(":")[0]!, back: pair.split(":")[1]!, back_language: "fr", state: "new", due_at: new Date(Date.now() - 3_600_000).toISOString() })));
    expect(cards.error).toBeNull();

    const text = await app()
      .from("text")
      .insert({ language: "it", level_band: "B1", density: 2, theme: `loop-${runId}`, prompt_version: "t", title: "Una giornata", body: body("parola", 40), word_count: 40, status: "published", writing_task: "Racconta la tua giornata.", listening_segment: { from: 0, to: 1 } })
      .select("id")
      .single();
    expect(text.error).toBeNull();
    textIds.push(text.data!.id);
    const options = (right: string) => [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: right, text: "C" }].filter((option, index, all) => all.findIndex((o) => o.id === option.id) === index);
    const items = Array.from({ length: 4 }, (_, i) => ({ text_id: text.data!.id, step: "reading", kind: "mcq", position: i, prompt: { question: `Q${i}`, options: options("a") }, listening_only: i === 3 })).concat(
      Array.from({ length: 7 }, (_, i) => ({ text_id: text.data!.id, step: "workshop", kind: "mcq", position: i, prompt: { question: `W${i}`, options: options("b"), card: { kind: "word", front: `nuovo${i}`, back: `nouveau${i}`, backLanguage: "fr", context: null } }, listening_only: false })),
    );
    const inserted = await app().from("text_item").insert(items).select("id, step");
    expect(inserted.error).toBeNull();
    const keys = await app().from("text_item_key").insert(inserted.data!.map((item) => ({ item_id: item.id, answer: item.step === "reading" ? "a" : "b", accept: [] })));
    expect(keys.error).toBeNull();
  });

  afterAll(async () => {
    // The users first: `text_read` points at the text.
    for (const id of userIds) await admin!.auth.admin.deleteUser(id);
    if (textIds.length > 0) await app().from("text").delete().in("id", textIds);
  });

  it("serves the packet of the day once: a daily session with its text, items, keys and cards", async () => {
    const response = await handler(alice, servedAt)(new Request("http://localhost/api/session/today?language=it"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    packet = (await response.json()) as SessionPacket;
    expect(packet.session).toMatchObject({ language: "it", kind: "daily", format: 10, status: "planned" });
    expect(packet.session.servedAt).toBe(servedAt.toISOString());
    expect(packet.text?.writingTask).toBe("Racconta la tua giornata.");
    expect(packet.items.filter((item) => item.step === "reading")).toHaveLength(3);
    expect(packet.items.some((item) => item.listeningOnly)).toBe(true);
    expect(packet.items.every((item) => item.key.answer !== null)).toBe(true);
    expect(packet.cards).toHaveLength(5);
    for (const card of packet.cards) {
      expect(card.mode).toBe("recognition");
      expect(card.options).toHaveLength(4);
      expect(card.options.some((option) => option.id === card.id)).toBe(true);
      expect(card.correctOptionId).toBe(card.id);
    }
    expect(packet.quotas).toEqual({ writingFeedback: { used: 0, limit: 3 }, rewriteCheck: { used: 0, limit: 6 } });
    expect(packet.serverDay).toBe(learningDay(servedAt, "Europe/Paris"));

    // Idempotent: the same session and the same instant of service, whenever it is asked again.
    const again = (await (await handler(alice, new Date(servedAt.getTime() + 3_600_000))(new Request("http://localhost/api/session/today?language=it"))).json()) as SessionPacket;
    expect(again.session).toEqual(packet.session);
    expect(again.cards.map((card) => [card.id, card.mode, card.options])).toEqual(packet.cards.map((card) => [card.id, card.mode, card.options]));
    expect(again.items.map((item) => item.id)).toEqual(packet.items.map((item) => item.id));
    expect(await count("session")).toBe(1);
  });

  it("answers 401, 404 and review-only as the spec says", async () => {
    expect((await handler(null, servedAt)(new Request("http://localhost/api/session/today?language=it"))).status).toBe(401);
    expect((await handler(alice, servedAt)(new Request("http://localhost/api/session/today?language=es"))).status).toBe(404);
    expect((await handler(bob, servedAt)(new Request("http://localhost/api/session/today?language=it"))).status).toBe(404);
  });

  it("decides a whole session: XP, learning day, steps, ledger and memo are written; the replay writes nothing", async () => {
    const readingItems = packet.items.filter((item) => item.step === "reading");
    const workshopItems = packet.items.filter((item) => item.step === "workshop");
    events = [
      event("session_started", 5, { sessionId: packet.session.id }),
      ...packet.cards.slice(0, 3).map((card, i) =>
        event("review_attempt", 20 + i * 10, { cardId: card.id, mode: "recognition", answer: card.correctOptionId, shownAt: at(15 + i * 10), answeredAt: at(19 + i * 10), audioPlays: 0 }),
      ),
      event("reading_progress", 60, { sessionId: packet.session.id, textId: packet.text!.id, ratio: 0 }),
      event("reading_progress", 80, { sessionId: packet.session.id, textId: packet.text!.id, ratio: 1 }),
      ...readingItems.map((item, i) => event("comprehension_answer", 90 + i, { sessionId: packet.session.id, itemId: item.id, answer: item.key.answer })),
      ...workshopItems.slice(0, 3).map((item, i) => event("focus_attempt", 100 + i * 5, { sessionId: packet.session.id, itemId: item.id, try: 1, answer: item.key.answer, shownAt: at(96 + i * 5) })),
      event("ui_event", 120, { name: "sound_toggled", value: { on: true } }),
    ];
    const store = createIngestStore(service);
    const result = await ingestEvents({ store, userId: alice, events, now });
    expect(result.rejected).toEqual([]);
    expect(result.duplicates).toEqual([]);

    const first = await snapshot();
    expect(first.reviews).toBe(3);
    expect(first.attempts).toBe(3 + 3);
    expect(first.xp).toBeGreaterThan(0);
    expect(first.days).toBeGreaterThan(0);
    expect(first.steps).toBeGreaterThan(0);
    expect(first.reads).toBe(1);
    // One ledger line per accepted event, the interface event included (it has a row of its own, but the ledger holds every kind).
    expect(first.ledger).toBe(events.length);
    expect(first.cards).toBe(5 + 3);
    expect(first.seq).toBe(1);
    const state = await app().from("ingest_state").select("seq, memo").eq("user_id", alice).single();
    expect(ingestMemoSchema.safeParse(state.data!.memo).success).toBe(true);
    const day = learningDay(servedAt, "Europe/Paris");
    expect(ingestMemoSchema.parse(state.data!.memo).days[day]?.reviewSuccesses).toBeGreaterThan(0);
    const session = await app().from("session").select("status").eq("id", packet.session.id).single();
    expect(session.data?.status).toBe("started");

    // The same batch again: nothing new is written, every event is a duplicate.
    const replay = await ingestEvents({ store, userId: alice, events, now });
    expect(replay.rejected).toEqual([]);
    expect([...replay.duplicates].sort()).toEqual(events.map((e) => (e as { clientEventId: string }).clientEventId).sort());
    expect(await snapshot()).toEqual(first);
  });

  it("refuses a review in a mode other than the one served, before it can earn more", async () => {
    const card = packet.cards[3]!;
    const forged = event("review_attempt", 150, { cardId: card.id, mode: "production", answer: card.front, shownAt: at(140), answeredAt: at(145), audioPlays: 0 });
    const before = await snapshot();
    const result = await ingestEvents({ store: createIngestStore(service), userId: alice, events: [forged], now });
    expect(result.rejected).toEqual([{ clientEventId: forged.clientEventId, reason: "invalid_payload" }]);
    expect(await snapshot()).toEqual(before);
  });

  it("reports the session of another learner as foreign and a card of another learner as unknown", async () => {
    const foreignSession = event("session_started", 30, { sessionId: packet.session.id });
    const foreignCard = event("review_attempt", 40, { cardId: packet.cards[0]!.id, mode: "recognition", answer: packet.cards[0]!.id, shownAt: at(35), answeredAt: at(39), audioPlays: 0 });
    const result = await ingestEvents({ store: createIngestStore(service), userId: bob, events: [foreignSession, foreignCard], now });
    expect([...result.rejected].sort((a, b) => a.reason.localeCompare(b.reason))).toEqual(
      [
        { clientEventId: foreignCard.clientEventId, reason: "unknown_card" },
        { clientEventId: foreignSession.clientEventId, reason: "foreign_session" },
      ].sort((a, b) => a.reason.localeCompare(b.reason)),
    );
  });

  it("starts again from a fresh read when the sequence moved (stale), then writes", async () => {
    const real = createIngestStore(service);
    let calls = 0;
    const flaky: IngestStore = {
      readRows: (...args) => real.readRows(...args),
      callBatch: (userId, expectedSeq, payload) => {
        calls++;
        return calls === 1 ? Promise.reject(new IngestBatchError("stale", "40001", "stale sequence")) : real.callBatch(userId, expectedSeq, payload);
      },
    };
    const ui = event("ui_event", 200, { name: "haptics_toggled", value: { on: false } });
    const before = await snapshot();
    const result = await ingestEvents({ store: flaky, userId: alice, events: [ui], now });
    expect(result.rejected).toEqual([]);
    expect(calls).toBe(2);
    expect((await snapshot()).ledger).toBe(before.ledger + 1);
  });

  it("replays a batch the database refuses event by event: the refused one is server_refused, the others pass", async () => {
    const real = createIngestStore(service);
    const bad = event("ui_event", 210, { name: "sound_toggled", value: { on: true } });
    const good = event("ui_event", 220, { name: "haptics_toggled", value: { on: true } });
    const refusing: IngestStore = {
      readRows: (...args) => real.readRows(...args),
      callBatch: (userId, expectedSeq, payload) => {
        const ids = JSON.stringify(payload);
        return ids.includes(bad.clientEventId) ? Promise.reject(new IngestBatchError("refused", "23514", "a bound")) : real.callBatch(userId, expectedSeq, payload);
      },
    };
    const before = await snapshot();
    const result = await ingestEvents({ store: refusing, userId: alice, events: [bad, good], now });
    expect(result.rejected).toEqual([{ clientEventId: bad.clientEventId, reason: "server_refused" }]);
    const after = await snapshot();
    expect(after.ledger).toBe(before.ledger + 1);
    expect(after.ui).toBe(before.ui + 1);
  });

  it("is a passing failure when the database is busy", async () => {
    const real = createIngestStore(service);
    const busy: IngestStore = { readRows: (...args) => real.readRows(...args), callBatch: () => Promise.reject(new IngestBatchError("busy", "55P03", "lock")) };
    await expect(ingestEvents({ store: busy, userId: alice, events: [event("ui_event", 230, { name: "sound_toggled", value: {} })], now, log: () => undefined })).rejects.toThrow(/ingestion failed/);
  });

  it("accepts the first time zone change of an account older than 8 days (the baseline row is exempt from the bound)", async () => {
    const carol = await createUser("carol");
    const aged = await app().from("profile").update({ created_at: new Date(Date.now() - 30 * 86_400_000).toISOString() }).eq("user_id", carol);
    expect(aged.error).toBeNull();
    const travelling = { clientEventId: crypto.randomUUID(), kind: "ui_event", occurredAt: at(240), payload: { tz: "Europe/Rome", deviceId: DEVICE, seq: ++seq, name: "sound_toggled", value: { on: true } } };
    const result = await ingestEvents({ store: createIngestStore(service), userId: carol, events: [travelling], now, log: () => undefined });
    expect(result.rejected).toEqual([]);
    expect(await count("timezone_change", carol)).toBe(2);
    expect((await app().from("profile").select("time_zone").eq("user_id", carol).single()).data?.time_zone).toBe("Europe/Rome");
  });
});

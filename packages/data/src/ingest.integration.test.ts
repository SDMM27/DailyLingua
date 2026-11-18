import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { StoredSessionPlan } from "@dailylingua/schemas";
import type { AppClient, AppDatabase } from "./client";
import { callIngestBatch, claimEventRate, IngestBatchError } from "./ingest-write";
import { readIngestRows } from "./ingest-rows";
import {
  countCompletedShortSessions,
  insertSession,
  readLastSessionDay,
  readPlanningCards,
  readQuotaUsage,
  readSessionOfDay,
  readTextCandidates,
  readTextWithItems,
} from "./session-today";

/**
 * The reads, the writes and the two service functions of lot W against the LOCAL Supabase stack, with two throw-away
 * users (deleted afterwards). Skipped without the local stack or its keys; never runs `supabase db reset`.
 */
for (const path of ["../../.env.local", ".env.local"]) {
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
const EMPTY_REFS = { sessionIds: [], cardIds: [], textIds: [], productionIds: [], deviceIds: [], clientEventIds: [] };
const DAY = "2026-11-18";

describe.skipIf(!stackIsUp)("lot W data layer (local database, service role)", () => {
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const client = admin as unknown as AppClient;
  const runId = `${Date.now()}`;
  const userIds: string[] = [];
  const textIds: string[] = [];
  let alice = "";
  let bob = "";

  async function createUser(label: string): Promise<string> {
    const created = await admin!.auth.admin.createUser({ email: `lotw-${label}-${runId}@test.invalid`, password: `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`, email_confirm: true });
    if (created.error) throw created.error;
    userIds.push(created.data.user.id);
    return created.data.user.id;
  }

  const plan = (textId: string | null, itemIds: string[]): StoredSessionPlan => ({
    v: 1,
    steps: [{ step: "wake", minutes: 3, required: true }],
    requiredSteps: ["wake"],
    wake: { cardIds: [], newCardIds: [], budgetMinutes: 3, errorItemId: null },
    reading: { textId, itemIds },
    workshop: { itemIds: [] },
    momentumWords: null,
    rewriteSentences: 0,
    servedCards: {},
    resumption: false,
    newCardsSuspendedThrough: null,
  });

  beforeAll(async () => {
    alice = await createUser("alice");
    bob = await createUser("bob");
  });

  afterAll(async () => {
    if (textIds.length > 0) await admin!.schema("app").from("text").delete().in("id", textIds);
    for (const id of userIds) await admin!.auth.admin.deleteUser(id);
  });

  it("claimEventRate grants up to the limit and then refuses", async () => {
    expect(await claimEventRate(client, alice, 30, 50)).toBe(true);
    expect(await claimEventRate(client, alice, 20, 50)).toBe(true);
    expect(await claimEventRate(client, alice, 1, 50)).toBe(false);
    expect(await claimEventRate(client, bob, 50, 50)).toBe(true);
  });

  it("callIngestBatch maps a stale sequence and a refused payload", async () => {
    const stale = await callIngestBatch(client, alice, 7, {}).catch((e: unknown) => e);
    expect(stale).toBeInstanceOf(IngestBatchError);
    expect((stale as IngestBatchError).code).toBe("stale");
    const refused = await callIngestBatch(client, alice, 0, { surprise: [] }).catch((e: unknown) => e);
    expect((refused as IngestBatchError).code).toBe("refused");
    expect((refused as IngestBatchError).sqlstate).toBe("22023");
    const ok = await callIngestBatch(client, alice, 0, { memo: { v: 1 }, events: [{ client_event_id: crypto.randomUUID(), kind: "ui_event", fingerprint: "00112233445566778899aabbccddeeff" }] });
    expect(ok).toEqual({ seq: 1, duplicates: [] });
  });

  it("inserts the session of the day once, reads it back, and counts it", async () => {
    const input = { id: crypto.randomUUID(), userId: alice, language: "it", day: DAY, kind: "daily" as const, format: 10 as const, plan: plan(null, []), servedAt: "2026-11-18T07:00:00.000Z" };
    const first = await insertSession(client, input);
    const second = await insertSession(client, { ...input, id: crypto.randomUUID(), plan: { ...plan(null, []), rewriteSentences: 2 }, servedAt: "2026-11-18T09:00:00.000Z" });
    expect(second.id).toBe(first.id);
    expect(new Date(second.servedAt!).toISOString()).toBe("2026-11-18T07:00:00.000Z");
    expect((second.plan as StoredSessionPlan).rewriteSentences).toBe(0);
    expect((await readSessionOfDay(client, alice, "it", DAY))?.id).toBe(first.id);
    expect(await readSessionOfDay(client, bob, "it", DAY)).toBeNull();
    expect(await readLastSessionDay(client, alice, "it")).toBeNull();
    expect(await countCompletedShortSessions(client, alice, "it")).toBe(0);
    expect(await readQuotaUsage(client, alice, DAY, ["writing_feedback", "rewrite_check"])).toEqual({ writing_feedback: 0, rewrite_check: 0 });
  });

  it("reads a published text with items and keys, and offers only the texts not served yet", async () => {
    const inserted = await admin!
      .schema("app")
      .from("text")
      .insert([
        { language: "it", level_band: "B1", density: 2, theme: `lotw-${runId}-a`, prompt_version: "t", title: "A", body: "Testo uno.", word_count: 2, status: "published", writing_task: "Racconta", listening_segment: { from: 0, to: 1 } },
        { language: "it", level_band: "B1", density: 2, theme: `lotw-${runId}-b`, prompt_version: "t", title: "B", body: "Testo due.", word_count: 2, status: "published", writing_task: "Descrivi" },
        { language: "it", level_band: "B1", density: 2, theme: `lotw-${runId}-c`, prompt_version: "t", title: "C", body: "Senza compito.", word_count: 2, status: "published" },
      ])
      .select("id, theme");
    expect(inserted.error).toBeNull();
    for (const row of inserted.data ?? []) textIds.push(row.id);
    const [a, b] = inserted.data!;
    const item = await admin!.schema("app").from("text_item").insert({ text_id: a!.id, step: "reading", kind: "mcq", position: 0, prompt: { q: "?" }, listening_only: true }).select("id").single();
    expect(item.error).toBeNull();
    const key = await admin!.schema("app").from("text_item_key").insert({ item_id: item.data!.id, answer: "a", accept: [] });
    expect(key.error).toBeNull();

    const found = await readTextWithItems(client, a!.id);
    expect(found?.text.writingTask).toBe("Racconta");
    expect(found?.text.listeningSegment).toEqual({ from: 0, to: 1 });
    expect(found?.items[0]?.key).toEqual({ answer: "a", accept: [] });

    const mine = (await readTextCandidates(client, bob, "it", ["B1"])).filter((t) => textIds.includes(t.id));
    expect(mine.map((t) => t.id).sort()).toEqual([a!.id, b!.id].sort());
    // Alice holds text A in her session of the day (and has read nothing): only B is left for her.
    await admin!.schema("app").from("session").update({ plan: plan(a!.id, [item.data!.id]) }).eq("user_id", alice).eq("day", DAY);
    const hers = (await readTextCandidates(client, alice, "it", ["B1"])).filter((t) => textIds.includes(t.id));
    expect(hers.map((t) => t.id)).toEqual([b!.id]);
    await admin!.schema("app").from("text_read").insert({ user_id: alice, text_id: b!.id, first_read_day: DAY });
    expect((await readTextCandidates(client, alice, "it", ["B1"])).filter((t) => textIds.includes(t.id))).toEqual([]);
  });

  it("readIngestRows reads the session, its items, texts and journals, and the foreign session without steps", async () => {
    const own = await readSessionOfDay(client, alice, "it", DAY);
    const card = await admin!.schema("app").from("card").insert({ user_id: bob, language: "it", kind: "word", front: "Casa", back: "maison", back_language: "fr", state: "new", due_at: "2026-11-18T00:00:00Z" }).select("id").single();
    expect(card.error).toBeNull();
    const rows = await readIngestRows(client, alice, { ...EMPTY_REFS, cardIds: [card.data!.id], deviceIds: [crypto.randomUUID()] }, { from: "2026-11-10", to: "2026-11-19" });
    expect(rows.sessions.map((s) => s.id)).toEqual([own!.id]);
    expect(rows.items).toHaveLength(1);
    expect(rows.items[0]?.key).toEqual({ answer: "a", accept: [] });
    expect(rows.texts).toHaveLength(1);
    // Bob's card reaches the planner as a card of another user.
    expect(rows.cards.map((c) => [c.id, c.userId])).toEqual([[card.data!.id, bob]]);
    expect(rows.ingestState.seq).toBe(1);
    expect(rows.ingestState.memo).toEqual({ v: 1 });
    expect(rows.profile.timeZone).toBeTruthy();
    expect(rows.streak).not.toBeNull();
    expect(Object.keys(rows.knownEvents)).toHaveLength(0);

    const foreign = await readIngestRows(client, bob, { ...EMPTY_REFS, sessionIds: [own!.id] }, { from: "2026-11-10", to: "2026-11-19" });
    expect(foreign.sessions.map((s) => [s.id, s.userId])).toEqual([[own!.id, alice]]);
    expect(foreign.items).toHaveLength(0);
    expect((await readPlanningCards(client, bob, "it")).map((c) => c.front)).toEqual(["Casa"]);
  });
});

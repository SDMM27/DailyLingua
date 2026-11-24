import { createClient } from "@supabase/supabase-js";
import { getUnit } from "@dailylingua/content";
import { getUnitProgress, getUnitProgressOne, type AppClient, type AppDatabase } from "@dailylingua/data";
import type { SituationUnit, UnitItem } from "@dailylingua/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIngestStore, ingestEvents } from "./ingest-events";

/**
 * The units against the LOCAL Supabase stack, with the real data layer and the real content of `it-a1-01-saluer`:
 * item attempts and steps decided by `planIngest` and written by `app.ingest_batch`, the key phrases turned into cards,
 * the test passed once (25 XP), a second pass that earns nothing, a replay that writes nothing, an old version refused,
 * and the progress read back through each learner's own client (RLS). Throw-away users, deleted afterwards. Skipped
 * without the local stack or its keys; never runs `supabase db reset`.
 */
for (const path of ["../../../../.env.local", "../../../.env.local", "../../.env.local"]) {
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
const UNIT_ID = "it-a1-01-saluer";
const DEVICE = crypto.randomUUID();

/** The answer the server grades right for an item of the real content. */
function rightAnswer(item: UnitItem): string {
  switch (item.kind) {
    case "mcq":
    case "listen_mcq":
    case "order":
      return item.answer;
    case "cloze":
    case "type":
      return item.accept[0] as string;
    case "match":
      return item.pairs.map((_, i) => `${i}:${i}`).join(",");
  }
}

describe.skipIf(!stackIsUp)("units through the ingestion (local database, service role)", () => {
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const service = admin as unknown as AppClient;
  const app = () => admin!.schema("app");
  const unit = getUnit(UNIT_ID) as SituationUnit;
  const runId = `${Date.now()}`;
  const users: { id: string; email: string; password: string }[] = [];
  let alice = "";
  let bob = "";
  let seq = 0;
  const drafts = process.env.UNIT_DRAFTS;
  const start = Date.now() - 10 * 60_000;
  const at = (seconds: number) => new Date(start + seconds * 1000).toISOString();
  const event = (kind: string, seconds: number, extra: Record<string, unknown>) => ({
    clientEventId: crypto.randomUUID(),
    kind,
    occurredAt: at(seconds),
    payload: { tz: "Europe/Paris", deviceId: DEVICE, seq: ++seq, unitId: UNIT_ID, unitVersion: unit.version, ...extra },
  });
  const item = (id: string) => unit.items.find((entry) => entry.id === id)!;
  const stepItems = (lesson: string, step: string) => unit.lessons.find((l) => l.id === lesson)!.steps.find((s) => s.step === step)?.itemIds ?? [];
  const ingest = (userId: string, events: unknown[]) => ingestEvents({ store: createIngestStore(service), userId, events, now: new Date(), log: () => undefined });

  async function createUser(label: string): Promise<string> {
    const email = `units-${label}-${runId}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const created = await admin!.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    users.push({ id: created.data.user.id, email, password });
    return created.data.user.id;
  }

  async function userClient(userId: string): Promise<AppClient> {
    const user = users.find((entry) => entry.id === userId)!;
    const client = createClient<AppDatabase>(url!, anonKey!, { auth: { persistSession: false } });
    const signed = await client.auth.signInWithPassword({ email: user.email, password: user.password });
    if (signed.error) throw signed.error;
    return client as unknown as AppClient;
  }

  async function xp(userId: string, reason: string) {
    const rows = await app().from("xp_ledger").select("amount").eq("user_id", userId).eq("reason", reason);
    return (rows.data ?? []).reduce((sum, row) => sum + row.amount, 0);
  }

  beforeAll(async () => {
    // The flag is set for the test that holds a unit back to "reviewed"; published units need no flag.
    process.env.UNIT_DRAFTS = "show";
    alice = await createUser("alice");
    bob = await createUser("bob");
  });

  afterAll(async () => {
    if (drafts === undefined) delete process.env.UNIT_DRAFTS;
    else process.env.UNIT_DRAFTS = drafts;
    for (const user of users) await admin!.auth.admin.deleteUser(user.id);
  });

  it("grades the dialogue and the key phrases, records the steps and turns the key phrases into cards", async () => {
    const ids = [...stepItems("l1", "dialogue"), ...stepItems("l1", "key_phrases")];
    const attempts = ids.map((id, i) => event("unit_item_attempt", 10 + i * 5, { lesson: "l1", itemId: id, try: 1, answer: rightAnswer(item(id)), shownAt: at(8 + i * 5) }));
    const steps = [event("unit_step_completed", 200, { lesson: "l1", step: "dialogue" }), event("unit_step_completed", 201, { lesson: "l1", step: "key_phrases" })];
    const result = await ingest(alice, [...attempts, ...steps]);
    expect(result.rejected).toEqual([]);
    const progress = await getUnitProgressOne(service, alice, UNIT_ID);
    expect(progress).toMatchObject({ language: "it", version: unit.version, bestScore: null, testAttempts: 0, passedAt: null });
    expect(Object.keys(progress!.steps).sort()).toEqual(["l1:dialogue", "l1:key_phrases"]);
    expect(await xp(alice, "focus.first_try")).toBe(Math.min(20, 2 * new Set(ids).size));
    const cards = await app().from("card").select("front, kind, source, back_language").eq("user_id", alice).eq("source", "unit");
    expect(cards.data).toHaveLength(new Set(unit.keyPhrases.map((phrase) => phrase.text.toLowerCase())).size);
    expect(cards.data!.every((card) => card.kind === "chunk" && ["fr", "en"].includes(card.back_language ?? ""))).toBe(true);
    const attemptRows = await app().from("attempt").select("step, exercise_kind, session_id").eq("user_id", alice);
    expect(attemptRows.data!.every((row) => row.step === "unit" && row.exercise_kind.startsWith("unit_") && row.session_id === null)).toBe(true);

    // A replay of the same events writes nothing.
    const before = await app().from("attempt").select("id", { count: "exact", head: true }).eq("user_id", alice);
    const replay = await ingest(alice, [...attempts, ...steps]);
    expect(replay.rejected).toEqual([]);
    const after = await app().from("attempt").select("id", { count: "exact", head: true }).eq("user_id", alice);
    expect(after.count).toBe(before.count);
  });

  it("refuses a step the attempts do not prove and an event on another version", async () => {
    const unproven = event("unit_step_completed", 300, { lesson: "l2", step: "exercises" });
    const old = { ...event("unit_item_attempt", 301, { lesson: "l1", itemId: stepItems("l1", "dialogue")[0], try: 1, answer: "x", shownAt: at(300) }) };
    (old.payload as Record<string, unknown>).unitVersion = "000000000000";
    const result = await ingest(alice, [unproven, old]);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected).toEqual(expect.arrayContaining([
      { clientEventId: unproven.clientEventId, reason: "step_not_proven" },
      { clientEventId: old.clientEventId, reason: "unit_version_mismatch" },
    ]));
  });

  it("pays unit.complete once for a passed test; a second pass is recorded but earns nothing", async () => {
    const answers = unit.test.itemIds.map((id) => ({ itemId: id, answer: rightAnswer(item(id)) }));
    const attemptId = crypto.randomUUID();
    const first = event("unit_test_submitted", 400, { attemptId, startedAt: at(350), answers });
    expect((await ingest(alice, [first])).rejected).toEqual([]);
    expect(await xp(alice, "unit.complete")).toBe(25);
    const passed = await getUnitProgressOne(service, alice, UNIT_ID);
    expect(passed).toMatchObject({ bestScore: 10, testAttempts: 1, passedAt: expect.any(String), passedVersion: unit.version });

    const second = event("unit_test_submitted", 450, { attemptId: crypto.randomUUID(), startedAt: at(420), answers: answers.slice(0, 8) });
    expect((await ingest(alice, [second])).rejected).toEqual([]);
    expect(await xp(alice, "unit.complete")).toBe(25);
    const again = await getUnitProgressOne(service, alice, UNIT_ID);
    expect(again).toMatchObject({ bestScore: 10, testAttempts: 2, passedAt: passed!.passedAt });
    const tests = await app().from("unit_test").select("score, passed").eq("user_id", alice).order("created_at");
    expect(tests.data).toEqual([{ score: 10, passed: true }, { score: 8, passed: true }]);

    // The same attempt id under another event is a duplicate.
    const reused = event("unit_test_submitted", 460, { attemptId, startedAt: at(455), answers });
    expect((await ingest(alice, [reused])).rejected).toEqual([{ clientEventId: reused.clientEventId, reason: "duplicate_test_attempt" }]);
  });

  it("reads the progress through each learner's own client: nobody sees another's", async () => {
    const aliceClient = await userClient(alice);
    const bobClient = await userClient(bob);
    expect((await getUnitProgress(aliceClient, alice, "it")).map((row) => row.unitId)).toEqual([UNIT_ID]);
    expect(await getUnitProgress(bobClient, alice, "it")).toEqual([]);
    expect(await getUnitProgressOne(bobClient, alice, UNIT_ID)).toBeNull();
    const write = await (bobClient as unknown as ReturnType<typeof createClient<AppDatabase>>).schema("app").from("unit_progress").insert({ user_id: bob, unit_id: UNIT_ID, language: "it", version: unit.version });
    expect(write.error).not.toBeNull();
  });

  it("refuses a unit that is not published without the draft flag", async () => {
    // The real unit is published: hold it back to "reviewed" for this test only (the registry entry is shared).
    const entry = getUnit(UNIT_ID) as { status: string };
    const status = entry.status;
    entry.status = "reviewed";
    delete process.env.UNIT_DRAFTS;
    try {
      const attempt = event("unit_item_attempt", 500, { lesson: "l1", itemId: stepItems("l1", "dialogue")[0], try: 1, answer: "x", shownAt: at(499) });
      expect((await ingest(bob, [attempt])).rejected).toEqual([{ clientEventId: attempt.clientEventId, reason: "unknown_unit" }]);
    } finally {
      entry.status = status;
      process.env.UNIT_DRAFTS = "show";
    }
  });
});

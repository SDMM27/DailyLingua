import { createClient } from "@supabase/supabase-js";
import { getUnit } from "@dailylingua/content";
import { getLastFailedTest, getPendingWarmups, getUnitXp, type AppClient, type AppDatabase } from "@dailylingua/data";
import type { UnitItem } from "@dailylingua/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIngestStore, ingestEvents } from "./ingest-events";

/**
 * The warm-up reads against the LOCAL Supabase stack, through each learner's own client (RLS): the missed items of a
 * failed test, the ones answered right since, the XP a unit paid, and nobody seeing another's rows. Throw-away users,
 * deleted afterwards. Skipped without the local stack or its keys; never runs `supabase db reset`.
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

async function localStackIsUp(): Promise<boolean> {
  if (!url || !anonKey || !serviceKey) return false;
  try {
    if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)) return false;
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

const stackIsUp = await localStackIsUp();
const UNIT_ID = "it-a1-01-saluer";
const DEVICE = crypto.randomUUID();

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

describe.skipIf(!stackIsUp)("warm-up reads (local database, learner's own client)", () => {
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const service = admin as unknown as AppClient;
  const unit = getUnit(UNIT_ID)!;
  const runId = `${Date.now()}`;
  const users: { id: string; email: string; password: string }[] = [];
  let alice = "";
  let bob = "";
  let seq = 0;
  const start = Date.now() - 10 * 60_000;
  const at = (seconds: number) => new Date(start + seconds * 1000).toISOString();
  const event = (kind: string, seconds: number, extra: Record<string, unknown>) => ({
    clientEventId: crypto.randomUUID(),
    kind,
    occurredAt: at(seconds),
    payload: { tz: "Europe/Paris", deviceId: DEVICE, seq: ++seq, unitId: UNIT_ID, unitVersion: unit.version, ...extra },
  });
  const ingest = (userId: string, events: unknown[]) => ingestEvents({ store: createIngestStore(service), userId, events, now: new Date(), log: () => undefined });
  const lessonOf = (id: string) => unit.lessons.find((lesson) => lesson.steps.some((step) => step.itemIds.includes(id)))!.id;
  const byId = (id: string) => unit.items.find((item) => item.id === id)!;

  async function createUser(label: string): Promise<string> {
    const email = `warmup-${label}-${runId}@test.invalid`;
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

  beforeAll(async () => {
    alice = await createUser("alice");
    bob = await createUser("bob");
  });

  afterAll(async () => {
    for (const user of users) await admin!.auth.admin.deleteUser(user.id);
  });

  it("lists the items of a failed test not yet answered right, and pays XP per unit", async () => {
    // Two items of the lessons answered right (XP), then a test with every answer wrong.
    const lessonItems = unit.lessons.flatMap((lesson) => lesson.steps.filter((step) => step.step !== "test").flatMap((step) => step.itemIds));
    const [first, second] = [...new Set(lessonItems)].slice(0, 2) as [string, string];
    const earlier = [first, second].map((id, i) => event("unit_item_attempt", 10 + i * 5, { lesson: lessonOf(id), itemId: id, try: 1, answer: rightAnswer(byId(id)), shownAt: at(8 + i * 5) }));
    expect((await ingest(alice, earlier)).rejected).toEqual([]);
    const answers = unit.test.itemIds.map((id) => ({ itemId: id, answer: "x" }));
    const test = event("unit_test_submitted", 100, { attemptId: crypto.randomUUID(), startedAt: at(60), answers });
    expect((await ingest(alice, [test])).rejected).toEqual([]);

    const client = await userClient(alice);
    const failed = await getLastFailedTest(client, alice, UNIT_ID);
    expect(failed).toMatchObject({ unitId: UNIT_ID, version: unit.version, score: 0 });
    expect(failed!.missed.sort()).toEqual([...unit.test.itemIds].sort());
    expect(await getUnitXp(client, alice, UNIT_ID)).toBe(4);

    const pending = await getPendingWarmups(client, alice, "it");
    expect(pending).toHaveLength(1);
    expect(pending[0]!.itemIds.sort()).toEqual([...unit.test.itemIds].sort());

    // An item answered right after the test leaves the warm-up. The ingestion stamps the test when it records it, so the
    // answer must be dated after it.
    const target = unit.test.itemIds.find((id) => lessonItems.includes(id))!;
    const later = { ...event("unit_item_attempt", 0, { lesson: lessonOf(target), itemId: target, try: 1, answer: rightAnswer(byId(target)), shownAt: new Date().toISOString() }), occurredAt: new Date().toISOString() };
    expect((await ingest(alice, [later])).rejected).toEqual([]);
    const after = await getPendingWarmups(client, alice, "it");
    expect(after[0]!.itemIds).not.toContain(target);
    expect(after[0]!.itemIds).toHaveLength(unit.test.itemIds.length - 1);
  });

  it("shows nobody else's tests, attempts or XP", async () => {
    const client = await userClient(bob);
    expect(await getLastFailedTest(client, alice, UNIT_ID)).toBeNull();
    expect(await getPendingWarmups(client, alice, "it")).toEqual([]);
    expect(await getUnitXp(client, alice, UNIT_ID)).toBe(0);
  });
});

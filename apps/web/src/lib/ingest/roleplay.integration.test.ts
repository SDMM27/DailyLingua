import { createClient } from "@supabase/supabase-js";
import { createRoleplayStore, readIngestRoleplays, type AppClient, type AppDatabase } from "@dailylingua/data";
import type { RoleplayReview, RoleplayTurn } from "@dailylingua/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIngestStore, ingestEvents } from "./ingest-events";

/**
 * The role play against the LOCAL Supabase stack, with the real data layer: the store's reads and writes (one active
 * game, 24 h abandon, writes only on an active game of the account), then `roleplay_completed` through the ingestion
 * (`roleplay.completed` paid once, 0 with a reason for a short game, a foreign game refused). Throw-away users, deleted
 * afterwards. Skipped without the local stack or its keys; never runs `supabase db reset`.
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
const DEVICE = crypto.randomUUID();
const words = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(" ");

describe.skipIf(!stackIsUp)("the role play against the local database (service role)", () => {
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const service = admin as unknown as AppClient;
  const app = () => admin!.schema("app");
  let store: ReturnType<typeof createRoleplayStore>;
  const runId = `${Date.now()}`;
  const users: string[] = [];
  let alice = "";
  let bob = "";
  let seq = 0;
  const now = new Date();
  const ai = (text = "Buongiorno"): RoleplayTurn => ({ role: "ai", text, translation: "Bonjour", at: now.toISOString() });
  const learner = (text: string): RoleplayTurn => ({ role: "learner", text, via: "typed", at: now.toISOString() });
  const review = (detectedLanguage: string | null): RoleplayReview => ({
    objectives: [{ met: true, comment: "ok" }, { met: false, comment: "" }, { met: false, comment: "" }],
    errors: [], betterPhrasings: [], detectedLanguage,
  });
  const completed = (roleplayId: string) => ({
    clientEventId: crypto.randomUUID(), kind: "roleplay_completed", occurredAt: new Date().toISOString(),
    payload: { tz: "Europe/Paris", deviceId: DEVICE, seq: ++seq, roleplayId },
  });
  const ingest = (userId: string, events: unknown[]) => ingestEvents({ store: createIngestStore(service), userId, events, now: new Date(), log: () => undefined });

  async function makeUser(label: string) {
    const created = await admin!.auth.admin.createUser({ email: `roleplay-${label}-${runId}@test.invalid`, password: `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`, email_confirm: true });
    if (created.error) throw created.error;
    users.push(created.data.user.id);
    expect((await app().from("enrollment").insert({ user_id: created.data.user.id, language: "it", daily_minutes: 10, position: 0 })).error).toBeNull();
    return created.data.user.id;
  }

  /** A finished game with `turns` learner turns of `wordsEach` words. */
  async function finishedGame(userId: string, turns: number, wordsEach: number, detected: string | null) {
    const lines = Array.from({ length: turns }, (_, i) => [learner(words(`w${i}x`, wordsEach)), ai()]).flat();
    const game = await store.create({ userId, language: "it", scenarioId: "cafe-order", level: "A2", turns: [ai(), ...lines] });
    const done = await store.finish({ userId, id: game!.id, previousTurns: game!.turns, review: review(detected), objectivesMet: [true, false, false], now: new Date() });
    return done!;
  }
  async function xp(userId: string) {
    const rows = await app().from("xp_ledger").select("amount, rule_version, meta").eq("user_id", userId).eq("reason", "roleplay.completed");
    return rows.data ?? [];
  }

  beforeAll(async () => {
    store = createRoleplayStore(service);
    alice = await makeUser("alice");
    bob = await makeUser("bob");
  });

  afterAll(async () => {
    for (const id of users) await admin!.auth.admin.deleteUser(id);
  });

  it("keeps one active game an account, writes only the account's active game, and abandons a stale one when it is read", async () => {
    const game = await store.create({ userId: alice, language: "it", scenarioId: "cafe-order", level: "A2", turns: [ai()] });
    expect(game).toMatchObject({ status: "active", objectivesMet: [false, false, false] });
    expect(await store.create({ userId: alice, language: "it", scenarioId: "ask-directions", level: "A2", turns: [ai()] })).toBeNull();

    // Another account cannot write it, and a write needs the game to be active.
    expect(await store.saveTurns({ userId: bob, id: game!.id, previousTurns: game!.turns, turns: [ai(), learner("ciao")], objectivesMet: [true, true, true] })).toBeNull();
    expect(await store.read(bob, game!.id, now)).toBeNull();
    const saved = await store.saveTurns({ userId: alice, id: game!.id, previousTurns: game!.turns, turns: [ai(), learner("ciao"), ai()], objectivesMet: [true, false, false] });
    expect(saved).toMatchObject({ objectivesMet: [true, false, false] });
    expect(saved?.turns).toHaveLength(3);
    expect(await store.saveTurns({ userId: alice, id: game!.id, previousTurns: game!.turns, turns: [ai()], objectivesMet: [false, false, false] })).toBeNull();

    // 25 hours later the game is abandoned by the read, then nothing can be written to it.
    await app().from("roleplay").update({ created_at: new Date(Date.now() - 25 * 3_600_000).toISOString() }).eq("id", game!.id);
    expect(await store.readActive(alice, now)).toBeNull();
    expect(await store.read(alice, game!.id, now)).toMatchObject({ status: "abandoned" });
    expect(await store.saveTurns({ userId: alice, id: game!.id, previousTurns: saved!.turns, turns: [ai()], objectivesMet: [true, true, true] })).toBeNull();
    expect(await store.finish({ userId: alice, id: game!.id, previousTurns: saved!.turns, review: review("it"), objectivesMet: [true, true, true], now })).toBeNull();
  });

  it("pays roleplay.completed once for a finished game of 3 turns, the words of the level and the target language", async () => {
    const game = await finishedGame(alice, 3, 12, "it");
    const event = completed(game.id);
    const result = await ingest(alice, [event]);
    expect(result.rejected).toEqual([]);
    const lines = await xp(alice);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ amount: 15, rule_version: "j5.2", meta: expect.objectContaining({ ref: game.id, volet: "output" }) });

    // The ledger tells the store the game was paid.
    expect(await readIngestRoleplays(service, alice, [game.id])).toEqual([expect.objectContaining({ id: game.id, paid: true })]);
    expect(await store.readXp(alice, game.id)).toBe(15);
    expect(await store.readXp(bob, game.id)).toBe(0);

    // The same event again, and the same game under a new event id, pay nothing more.
    await ingest(alice, [event]);
    await ingest(alice, [completed(game.id)]);
    expect(await xp(alice)).toHaveLength(1);
  });

  it("pays 0 for a short game or another language, and refuses a game of another account or an unfinished one", async () => {
    const short = await finishedGame(bob, 2, 40, "it");
    const shortResult = await ingest(bob, [completed(short.id)]);
    expect(shortResult.rejected).toEqual([]);
    expect(await xp(bob)).toEqual([]);

    const foreign = await finishedGame(alice, 3, 12, "it");
    const stolen = completed(foreign.id);
    expect((await ingest(bob, [stolen])).rejected).toEqual([{ clientEventId: stolen.clientEventId, reason: "unknown_roleplay" }]);

    const active = await store.create({ userId: bob, language: "it", scenarioId: "cafe-order", level: "A2", turns: [ai()] });
    const early = completed(active!.id);
    expect((await ingest(bob, [early])).rejected).toEqual([{ clientEventId: early.clientEventId, reason: "unknown_roleplay" }]);
    await store.abandon(bob, active!.id, new Date(), active!.turns);

    const french = await finishedGame(bob, 3, 12, "fr");
    expect((await ingest(bob, [completed(french.id)])).rejected).toEqual([]);
    expect(await xp(bob)).toEqual([]);
  });
});

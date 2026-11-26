import { createClient } from "@supabase/supabase-js";
import { oralSentences } from "@dailylingua/content";
import { getRecentOralAttempts, type AppClient, type AppDatabase } from "@dailylingua/data";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createIngestStore, ingestEvents } from "./ingest-events";

/**
 * The oral workshop against the LOCAL Supabase stack, with the real data layer and the real sentences of the content:
 * a batch of `oral_attempt` events written by `app.ingest_batch` as `attempt` rows (step `oral`) and `xp_ledger` lines
 * (`shadowing.sentence`, `dictation.sentence`), the second pass of a sentence a day paid nothing, a language the learner
 * does not study refused, and the attempts read back through the learner's own client (RLS). Throw-away users, deleted
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

describe.skipIf(!stackIsUp)("the oral workshop through the ingestion (local database, service role)", () => {
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const service = admin as unknown as AppClient;
  const app = () => admin!.schema("app");
  const [first, second] = oralSentences("it") as [ReturnType<typeof oralSentences>[number], ReturnType<typeof oralSentences>[number]];
  const russian = oralSentences("ru")[0]!;
  const runId = `${Date.now()}`;
  const users: { id: string; email: string; password: string }[] = [];
  let alice = "";
  let seq = 0;
  const start = Date.now() - 10 * 60_000;
  const at = (seconds: number) => new Date(start + seconds * 1000).toISOString();
  const oral = (sentence: { id: string; unitVersion: string }, seconds: number, extra: Record<string, unknown>) => ({
    clientEventId: crypto.randomUUID(),
    kind: "oral_attempt",
    occurredAt: at(seconds),
    payload: {
      tz: "Europe/Paris",
      deviceId: DEVICE,
      seq: ++seq,
      sentenceId: sentence.id,
      unitVersion: sentence.unitVersion,
      activity: "shadowing",
      answer: "",
      recognizer: "device",
      selfRating: null,
      shownAt: at(seconds - 30),
      startedAt: at(seconds - 10),
      endedAt: at(seconds),
      ...extra,
    },
  });
  const ingest = (userId: string, events: unknown[]) => ingestEvents({ store: createIngestStore(service), userId, events, now: new Date(), log: () => undefined });

  async function xp(userId: string, reason: string) {
    const rows = await app().from("xp_ledger").select("amount, rule_version, meta").eq("user_id", userId).eq("reason", reason);
    return { total: (rows.data ?? []).reduce((sum, row) => sum + row.amount, 0), rows: rows.data ?? [] };
  }

  beforeAll(async () => {
    const email = `oral-alice-${runId}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const created = await admin!.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    alice = created.data.user.id;
    users.push({ id: alice, email, password });
    expect((await app().from("enrollment").insert({ user_id: alice, language: "it", daily_minutes: 10, position: 0 })).error).toBeNull();
  });

  afterAll(async () => {
    for (const user of users) await admin!.auth.admin.deleteUser(user.id);
  });

  it("writes the attempts (step oral) and the XP lines of a batch, and refuses a language the learner does not study", async () => {
    const events = [
      oral(first, 100, { answer: first.text }),
      oral(first, 130, { activity: "anticipation", recognizer: "none", answer: "", selfRating: "got_it" }),
      oral(second, 160, { activity: "dictation", recognizer: "none", answer: second.text, shownAt: at(100), startedAt: at(120) }),
    ];
    const foreign = oral(russian, 170, { answer: russian.text });
    const result = await ingest(alice, [...events, foreign]);
    expect(result.rejected).toEqual([{ clientEventId: foreign.clientEventId, reason: "wrong_language" }]);

    const attempts = await app().from("attempt").select("step, exercise_kind, session_id, language, answer, result, correct").eq("user_id", alice).order("occurred_at");
    expect(attempts.data!.map((row) => [row.step, row.exercise_kind, row.session_id, row.language, row.correct])).toEqual([
      ["oral", "oral_shadowing", null, "it", true],
      ["oral", "oral_anticipation", null, "it", true],
      ["oral", "oral_dictation", null, "it", true],
    ]);
    expect(attempts.data![0]?.answer).toMatchObject({ sentenceId: first.id, recognizer: "device" });
    expect(attempts.data![0]?.result).toEqual({ ratio: 1, declared: false });
    expect(attempts.data![1]?.result).toEqual({ declared: true });

    const shadowing = await xp(alice, "shadowing.sentence");
    const dictation = await xp(alice, "dictation.sentence");
    expect(shadowing.total).toBe(1);
    expect(dictation.total).toBe(2);
    expect([...shadowing.rows, ...dictation.rows].every((row) => row.rule_version === "j5.2")).toBe(true);
    expect(shadowing.rows[0]?.meta).toMatchObject({ volet: "fluency" });
    expect(dictation.rows[0]?.meta).toMatchObject({ volet: "input" });
    expect(await xp(alice, "anticipation")).toMatchObject({ total: 0 });
  });

  it("pays the same sentence once a day, and a replay of the batch writes nothing", async () => {
    const again = oral(first, 200, { answer: first.text });
    const result = await ingest(alice, [again]);
    expect(result.rejected).toEqual([]);
    expect((await xp(alice, "shadowing.sentence")).total).toBe(1);
    const row = await app().from("attempt").select("result").eq("client_event_id", again.clientEventId).single();
    expect(row.data?.result).toEqual({ ratio: 1, declared: false, xpReason: "already_counted_today" });

    const before = await app().from("attempt").select("id", { count: "exact", head: true }).eq("user_id", alice);
    expect((await ingest(alice, [again])).rejected).toEqual([]);
    const after = await app().from("attempt").select("id", { count: "exact", head: true }).eq("user_id", alice);
    expect(after.count).toBe(before.count);
    expect((await xp(alice, "shadowing.sentence")).total).toBe(1);
  });

  it("reads the recent attempts back through the learner's own client", async () => {
    const user = users.find((entry) => entry.id === alice)!;
    const client = createClient<AppDatabase>(url!, anonKey!, { auth: { persistSession: false } });
    const signed = await client.auth.signInWithPassword({ email: user.email, password: user.password });
    expect(signed.error).toBeNull();
    const rows = await getRecentOralAttempts(client as unknown as AppClient, alice, "it");
    expect(rows.map((row) => [row.sentenceId, row.activity]).sort()).toEqual(
      [[first.id, "anticipation"], [first.id, "shadowing"], [first.id, "shadowing"], [second.id, "dictation"]].sort(),
    );
    expect(await getRecentOralAttempts(client as unknown as AppClient, alice, "ru")).toEqual([]);
  });
});

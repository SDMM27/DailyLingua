import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAiStore } from "./ai-store";
import type { AppClient, AppDatabase } from "./client";
import { DataError } from "./errors";

/**
 * `createAiStore` against the LOCAL Supabase stack: the SQL functions of
 * `20261114000100_app_ai_quota.sql` really accept what the store sends. One throw-away user,
 * deleted afterwards. Skipped without the local stack; never runs `supabase db reset`.
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

describe.skipIf(!stackIsUp)("createAiStore (local database, service role)", () => {
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const day = "2026-11-13";
  // A kind of its own, so that a parallel run or an earlier one cannot share the counter.
  const kind = `it_${Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 12) || "store"}`;
  let userId = "";

  beforeAll(async () => {
    const created = await admin!.auth.admin.createUser({
      email: `ai-store-${Date.now()}@test.invalid`,
      password: `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    userId = created.data.user.id;
  });

  afterAll(async () => {
    if (userId) await admin!.auth.admin.deleteUser(userId);
  });

  it("claims a quota up to its limit, then refuses, and gives a unit back on release", async () => {
    const store = createAiStore(admin as AppClient);
    expect(await store.claimQuota({ userId, kind, limit: 2, day })).toBe(true);
    expect(await store.claimQuota({ userId, kind, limit: 2, day })).toBe(true);
    expect(await store.claimQuota({ userId, kind, limit: 2, day })).toBe(false);
    await store.releaseQuota({ userId, kind, day });
    expect(await store.claimQuota({ userId, kind, limit: 2, day })).toBe(true);
  });

  it("records a call, with and without a learner, and adds its cost to the month", async () => {
    const store = createAiStore(admin as AppClient);
    const at = new Date();
    const before = await store.monthSpendUsd(at);
    const call = {
      purpose: "writing_feedback",
      model: "claude-haiku-5-5",
      promptVersion: "test.1",
      inputTokens: 3000,
      outputTokens: 3000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      batch: false,
      costUsd: 0.0018,
      status: "ok",
    } as const;
    await store.recordCall({ ...call, userId });
    await store.recordCall({ ...call, userId: null, costUsd: 0.0002, status: "error" });
    const after = await store.monthSpendUsd(at);
    expect(after - before).toBeCloseTo(0.002, 6);
  });

  it("is refused to a signed-in learner: only the service role reaches these functions", async () => {
    const client = createClient<AppDatabase>(url!, anonKey!, { auth: { persistSession: false } });
    const store = createAiStore(client as AppClient);
    await expect(store.monthSpendUsd(new Date())).rejects.toBeInstanceOf(DataError);
    await expect(store.claimQuota({ userId, kind, limit: 5, day })).rejects.toBeInstanceOf(DataError);
  });
});

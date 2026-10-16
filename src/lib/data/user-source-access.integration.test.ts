import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Preferences } from "@/lib/schemas/preferences";
import type { Database } from "@/lib/supabase/database.types";
import { UserFacingError } from "./errors";
import { createSupabaseRepository } from "./supabase-repository";

/**
 * Integration tests of `user_source_access` (migration, RLS) and of the repository methods built
 * on it, against the LOCAL Supabase stack, with two throw-away users and sources (all deleted
 * afterwards). Skipped when the local stack or the service role key is missing.
 */
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

const PREFERENCES: Preferences = {
  goals: [{ language: "it", level: "B1", targetLevel: "B2", focus: "", purpose: "general", weight: 1, topics: ["société"], contentTypes: ["article"] }],
  dailyMinutes: 20,
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: "Europe/Paris",
};

const stackIsUp = await localStackIsUp();

describe.skipIf(!stackIsUp)("user_source_access (local database, throw-away users)", () => {
  const runId = `${Date.now()}`;
  let admin: SupabaseClient<Database>;
  const users: { id: string; client: SupabaseClient<Database> }[] = [];
  const sourceIds: string[] = [];
  let meteredIt: string;
  let paywalledEs: string;
  let freeIt: string;
  let inactiveIt: string;

  async function createUser(label: string) {
    const email = `source-access-${label}-${runId}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    const user = { id: created.data.user.id, client };
    users.push(user);
    return user;
  }

  async function createSource(language: string, access: "free" | "metered" | "paywalled", suffix: string, active = true) {
    const { data, error } = await admin
      .from("sources")
      .insert({
        key: `test-access-${suffix}-${runId}`,
        name: `Source ${suffix}`,
        language,
        homepage_url: `https://test-access-${suffix}-${runId}.example.invalid/`,
        feed_url: `https://test-access-${suffix}-${runId}.example.invalid/feed`,
        access,
        content_type: "article",
        license_kind: "all-rights-reserved",
        license_name: "Tous droits réservés",
        terms_url: "https://example.invalid/terms",
        license_verified_on: "2026-10-01",
        commercial_use: false,
        active,
      })
      .select("id")
      .single();
    if (error) throw error;
    sourceIds.push(data.id);
    return data.id;
  }

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    await createUser("a");
    await createUser("b");
    meteredIt = await createSource("it", "metered", "metered-it");
    paywalledEs = await createSource("es", "paywalled", "paywalled-es");
    freeIt = await createSource("it", "free", "free-it");
    inactiveIt = await createSource("it", "paywalled", "inactive-it", false);
  });

  afterAll(async () => {
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
    if (sourceIds.length > 0) await admin.from("sources").delete().in("id", sourceIds);
  });

  describe("row level security", () => {
    it("lets an owner insert and read their own rows", async () => {
      const [a] = users;
      const { error } = await a.client.from("user_source_access").insert({ user_id: a.id, source_id: meteredIt });
      expect(error).toBeNull();
      const { data } = await a.client.from("user_source_access").select("source_id");
      expect(data).toEqual([{ source_id: meteredIt }]);
    });

    it("hides the rows of others and refuses to write for them", async () => {
      const [a, b] = users;
      expect((await b.client.from("user_source_access").select("source_id")).data).toEqual([]);
      const forged = await b.client.from("user_source_access").insert({ user_id: a.id, source_id: paywalledEs });
      expect(forged.error).not.toBeNull();
      // Deleting another user's row silently matches nothing.
      await b.client.from("user_source_access").delete().eq("user_id", a.id);
      const { data } = await admin.from("user_source_access").select("source_id").eq("user_id", a.id);
      expect(data).toEqual([{ source_id: meteredIt }]);
    });

    it("lets an owner delete their row, and offers no update", async () => {
      const [a] = users;
      const update = await a.client.from("user_source_access").update({ created_at: new Date().toISOString() }).eq("user_id", a.id);
      expect(update.error).not.toBeNull();
      const { error } = await a.client.from("user_source_access").delete().eq("user_id", a.id).eq("source_id", meteredIt);
      expect(error).toBeNull();
      expect((await a.client.from("user_source_access").select("source_id")).data).toEqual([]);
    });

    it("is out of reach of anonymous visitors", async () => {
      const anon = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
      const { data, error } = await anon.from("user_source_access").select("source_id");
      expect(error !== null || data?.length === 0).toBe(true);
    });

    it("goes away with the source", async () => {
      const [a] = users;
      const temp = await createSource("it", "metered", "temp-it");
      await a.client.from("user_source_access").insert({ user_id: a.id, source_id: temp });
      await admin.from("sources").delete().eq("id", temp);
      expect((await admin.from("user_source_access").select("source_id").eq("source_id", temp)).data).toEqual([]);
    });
  });

  describe("repository", () => {
    const repoFor = (index: number) => createSupabaseRepository(users[index].client, users[index].id);

    it("lists the paid sources of the user's languages, with their declaration", async () => {
      const repo = repoFor(0);
      await repo.savePreferences(PREFERENCES);
      const mine = (list: Awaited<ReturnType<typeof repo.listPaidSources>>) => list.filter((s) => sourceIds.includes(s.id));
      expect(mine(await repo.listPaidSources())).toEqual([
        { id: meteredIt, name: "Source metered-it", homepage: expect.any(String), language: "it", access: "metered", declared: false },
      ]);

      await repo.setSourceAccess(meteredIt, true);
      await repo.setSourceAccess(meteredIt, true); // idempotent
      expect(mine(await repo.listPaidSources()).map((s) => s.declared)).toEqual([true]);
      // Another user's declaration is not seen.
      expect((await admin.from("user_source_access").select("user_id").eq("source_id", meteredIt)).data).toEqual([
        { user_id: users[0].id },
      ]);

      await repo.setSourceAccess(meteredIt, false);
      await repo.setSourceAccess(meteredIt, false); // idempotent
      expect(mine(await repo.listPaidSources()).map((s) => s.declared)).toEqual([false]);
    });

    it("offers nothing before the user has chosen a language", async () => {
      expect(await repoFor(1).listPaidSources()).toEqual([]);
    });

    it("refuses a free, inactive or unknown source", async () => {
      const repo = repoFor(0);
      for (const id of [freeIt, inactiveIt, "00000000-0000-4000-8000-000000000000"]) {
        await expect(repo.setSourceAccess(id, true)).rejects.toBeInstanceOf(UserFacingError);
      }
      expect((await admin.from("user_source_access").select("source_id").eq("user_id", users[0].id)).data).toEqual([]);
    });
  });
});

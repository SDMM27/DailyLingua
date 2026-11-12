import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AppClient, AppDatabase } from "./client";
import { getProfile, saveProfile } from "./profile";
import { listEnrollments, listSkillEstimates, saveEnrollments } from "./enrollments";

/**
 * Integration tests against the LOCAL Supabase stack, with two throw-away users (deleted
 * afterwards). Skipped when the local stack or its keys are missing, like the integration tests of
 * the legacy app (`src/test/setup-env.ts`). This is the only file of the package that reads the
 * environment; it never runs `supabase db reset`.
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

/** True when `app.save_enrollments` exists (migration of lot A applied). */
async function saveEnrollmentsExists(admin: AppClient): Promise<boolean> {
  const { error } = await (admin as unknown as { schema(s: string): { rpc(f: string, a: object): PromiseLike<{ error: { code?: string } | null }> } })
    .schema("app")
    .rpc("save_enrollments", { p_enrollments: [] });
  // 28000 / 22023: the function exists and refused the call; PGRST202 / 42883: it does not exist.
  return error !== null && error.code !== "PGRST202" && error.code !== "42883";
}

const hasEnrollmentsFunction = stackIsUp
  ? await saveEnrollmentsExists(createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }))
  : false;

describe.skipIf(!stackIsUp)("@dailylingua/data (local database, throw-away users)", () => {
  const runId = `${Date.now()}`;
  const admin = stackIsUp ? createClient<AppDatabase>(url!, serviceKey!, { auth: { persistSession: false } }) : null;
  const users: { id: string; client: AppClient }[] = [];

  async function createUser(label: string) {
    const email = `data-${label}-${runId}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const created = await admin!.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    const client = createClient<AppDatabase>(url!, anonKey!, { auth: { persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    const user = { id: created.data.user.id, client: client as AppClient };
    users.push(user);
    return user;
  }

  let alice: (typeof users)[number];
  let bob: (typeof users)[number];

  beforeAll(async () => {
    alice = await createUser("alice");
    bob = await createUser("bob");
  });

  afterAll(async () => {
    for (const user of users) await admin!.auth.admin.deleteUser(user.id);
  });

  it("saves a profile and reads it back, for the owner only", async () => {
    const saved = await saveProfile(alice.client, {
      nativeLanguage: "ar",
      uiLanguage: "en",
      timeZone: "Asia/Tokyo",
      reminderTime: "08:15",
    });
    expect(saved).toMatchObject({ userId: alice.id, nativeLanguage: "ar", timeZone: "Asia/Tokyo", reminderTime: "08:15" });

    expect(await getProfile(alice.client)).toEqual(saved);

    const others = await getProfile(bob.client);
    expect(others?.userId).toBe(bob.id);
    expect(others?.nativeLanguage).not.toBe("ar");
  });

  it("maps an unknown time zone to an invalid DataError", async () => {
    await expect(
      saveProfile(alice.client, { nativeLanguage: "ar", uiLanguage: "en", timeZone: "Mars/Olympus", reminderTime: null }),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("shows a second user none of the first user's enrollments", async () => {
    expect(await listEnrollments(bob.client)).toEqual([]);
    expect(await listSkillEstimates(bob.client, "fr")).toEqual([]);
  });

  describe.skipIf(!hasEnrollmentsFunction)("saveEnrollments (needs the migration of lot A)", () => {
    it("saves a plan, declares the start level once and keeps users apart", async () => {
      await saveProfile(alice.client, { nativeLanguage: "ar", uiLanguage: "en", timeZone: "Asia/Tokyo", reminderTime: null });
      const plan = await saveEnrollments(alice.client, [
        { language: "fr", dailyMinutes: 15, startLevel: "A0" },
        { language: "es", dailyMinutes: 10, days: [1, 2, 3] },
      ]);
      expect(plan.map((e) => e.language)).toEqual(["fr", "es"]);
      expect((await listEnrollments(alice.client)).map((e) => e.position)).toEqual([0, 1]);
      expect(await listSkillEstimates(alice.client, "fr")).toHaveLength(4);
      expect(await listEnrollments(bob.client)).toEqual([]);

      const reduced = await saveEnrollments(alice.client, [{ language: "fr", dailyMinutes: 15, startLevel: "B1" }]);
      expect(reduced.map((e) => e.language)).toEqual(["fr"]);
      expect(await listSkillEstimates(alice.client, "fr")).toHaveLength(4);
    });

    it("refuses a native language that is being learned", async () => {
      await expect(
        saveProfile(alice.client, { nativeLanguage: "fr", uiLanguage: "en", timeZone: "Asia/Tokyo", reminderTime: null }),
      ).rejects.toMatchObject({ code: "conflict" });
    });
  });
});

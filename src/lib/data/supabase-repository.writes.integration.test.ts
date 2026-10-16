import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, toDateKey } from "@/lib/domain/dates";
import { createSessionReplacer } from "@/lib/generation/preparer";
import { createTemplateGenerator } from "@/lib/generation/template-generator";
import type { PlacementRecord } from "@/lib/schemas/placement";
import type { Preferences } from "@/lib/schemas/preferences";
import type { Database, Json } from "@/lib/supabase/database.types";
import { deleteUserAccount } from "@/lib/supabase/delete-account";
import { UserFacingError } from "./errors";
import { createSupabaseRepository } from "./supabase-repository";

/**
 * Write-path integration tests against the LOCAL Supabase stack. Each run creates its own
 * throw-away user (deleted afterwards, which cascades to all its data), so the demo account is
 * never touched. Skipped when the local stack or the service role key is missing.
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

// A zone far ahead of UTC, so "today" regularly differs from the server's (UTC) date.
const TIME_ZONE = "Pacific/Kiritimati";

const PREFERENCES: Preferences = {
  goals: [
    { language: "ru", level: "B2", targetLevel: "C1", focus: "", purpose: "general", weight: 2, topics: ["société"], contentTypes: ["article"] },
    { language: "it", level: "B1", targetLevel: "B2", focus: "", purpose: "general", weight: 1, topics: ["société"], contentTypes: ["article"] },
  ],
  dailyMinutes: 30,
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: TIME_ZONE,
};

const stackIsUp = await localStackIsUp();

describe.skipIf(!stackIsUp)("Supabase repository writes (local database, throw-away user)", () => {
  let admin: SupabaseClient<Database>;
  let userId: string;
  let repo: ReturnType<typeof createSupabaseRepository>;
  let userClient: SupabaseClient<Database>;
  const today = () => toDateKey(new Date(), TIME_ZONE);

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    const email = `writes-${Date.now()}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;

    const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    userClient = client;
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    repo = createSupabaseRepository(client, userId, {
      replaceSession: createSessionReplacer(admin, { generator: createTemplateGenerator() }),
    });
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("has no preferences until the first-run screen saves them", async () => {
    expect(await repo.getPreferences()).toBeNull();
    await repo.savePreferences(PREFERENCES);
    expect(await repo.getPreferences()).toEqual(PREFERENCES);
  });

  it("round-trips the purpose of each language", async () => {
    const goals = [
      { ...PREFERENCES.goals[0], purpose: "professional" as const },
      { ...PREFERENCES.goals[1], purpose: "exam" as const },
    ];
    await repo.savePreferences({ ...PREFERENCES, goals });
    expect((await repo.getPreferences())!.goals.map((g) => g.purpose)).toEqual(["professional", "exam"]);
  });

  it("round-trips the topics and content types of each language", async () => {
    const goals = [
      { ...PREFERENCES.goals[0], topics: ["économie" as const], contentTypes: ["article" as const] },
      { ...PREFERENCES.goals[1], topics: ["cinéma" as const, "sport" as const], contentTypes: ["podcast" as const, "video" as const] },
    ];
    await repo.savePreferences({ ...PREFERENCES, goals });
    const saved = (await repo.getPreferences())!.goals;
    expect(saved.map((g) => [g.language, g.topics, g.contentTypes])).toEqual([
      ["ru", ["économie"], ["article"]],
      ["it", expect.arrayContaining(["cinéma", "sport"]), expect.arrayContaining(["podcast", "video"])],
    ]);
    // New clients send them per language only: the profile columns are left untouched.
    const { data: profile } = await admin.from("profiles").select("topics, content_types").eq("id", userId).single();
    expect(profile).toEqual({ topics: ["société", "culture"], content_types: ["article", "podcast"] });
  });

  it("still accepts an old-style payload with top-level topics and none per language", async () => {
    await repo.savePreferences(PREFERENCES);
    const goal = (language: string, weight: number) => ({
      language, level: "B1", target_level: "B2", focus: "", purpose: "general", weight,
    });
    const { error } = await userClient.rpc("save_preferences", {
      p_daily_minutes: 30,
      p_topics: ["sciences"],
      p_content_types: ["interview"],
      p_difficulty: "matched",
      p_generation_time: "07:00",
      p_time_zone: TIME_ZONE,
      p_goals: [goal("ru", 2), goal("it", 1), goal("es", 1)],
    });
    expect(error).toBeNull();
    const byLanguage = Object.fromEntries((await repo.getPreferences())!.goals.map((g) => [g.language, g]));
    // Existing languages keep their own values; the new one takes the profile's (the old client's).
    expect(byLanguage.ru.topics).toEqual(PREFERENCES.goals[0].topics);
    expect(byLanguage.it.contentTypes).toEqual(PREFERENCES.goals[1].contentTypes);
    expect(byLanguage.es.topics).toEqual(["sciences"]);
    expect(byLanguage.es.contentTypes).toEqual(["interview"]);
    const { data: profile } = await admin.from("profiles").select("topics, content_types").eq("id", userId).single();
    expect(profile).toEqual({ topics: ["sciences"], content_types: ["interview"] });
    await repo.savePreferences(PREFERENCES);
  });

  it("refuses a language saved without topics", async () => {
    const goals = [{ ...PREFERENCES.goals[0], topics: [] as never }];
    await expect(repo.savePreferences({ ...PREFERENCES, goals })).rejects.toThrow();
  });

  it("computes today in the user's time zone", async () => {
    expect(await repo.getToday()).toBe(today());
  });

  it("replaces the language list when preferences are saved again", async () => {
    await repo.savePreferences({ ...PREFERENCES, goals: [PREFERENCES.goals[1]] });
    expect((await repo.getPreferences())!.goals.map((g) => g.language)).toEqual(["it"]);
    await repo.savePreferences(PREFERENCES);
    expect((await repo.getPreferences())!.goals).toHaveLength(2);
  });

  describe("vocabulary", () => {
    it("dates a new word with the user's today, not the server's", async () => {
      const item = await repo.addVocabulary({ language: "ru", term: "впрочем", translation: "cependant" });
      expect(item.addedOn).toBe(today());
      expect(item.review).toEqual({ box: 0, dueOn: today(), lastReviewedOn: null, reviewCount: 0 });
      expect((await repo.listVocabulary()).map((i) => i.term)).toContain("впрочем");
    });

    it("refuses a duplicate with a message for the user", async () => {
      await expect(
        repo.addVocabulary({ language: "ru", term: "впрочем", translation: "cependant" }),
      ).rejects.toBeInstanceOf(UserFacingError);
    });

    it("reviews a word once, and refuses a stale replay", async () => {
      const [item] = await repo.listVocabulary();
      const reviewed = await repo.reviewVocabulary({ id: item.id, grade: "good", expectedReviewCount: 0 });
      expect(reviewed.review).toMatchObject({ box: 1, lastReviewedOn: today(), reviewCount: 1 });
      expect((await repo.listVocabulary())[0].review).toEqual(reviewed.review);

      await expect(
        repo.reviewVocabulary({ id: item.id, grade: "good", expectedReviewCount: 0 }),
      ).rejects.toBeInstanceOf(UserFacingError);
      expect((await repo.listVocabulary())[0].review.reviewCount).toBe(1);
    });

    it("marks a word known, then deletes it", async () => {
      const [item] = await repo.listVocabulary();
      await repo.setVocabularyStatus(item.id, "known");
      expect((await repo.listVocabulary())[0].status).toBe("known");
      await repo.deleteVocabulary(item.id);
      expect(await repo.listVocabulary()).toEqual([]);
    });
  });

  describe("feedback", () => {
    it("stores a feedback for the user, with its page", async () => {
      await repo.sendFeedback({ category: "bug", message: "Ça ne marche pas", page: "/mission" });
      const { data } = await admin.from("feedback").select("category, message, page, user_id").eq("user_id", userId);
      expect(data).toEqual([{ category: "bug", message: "Ça ne marche pas", page: "/mission", user_id: userId }]);
    });

    it("refuses the 21st feedback of the day with a message for the user", async () => {
      const { count } = await admin.from("feedback").select("*", { count: "exact", head: true }).eq("user_id", userId);
      for (let i = count ?? 0; i < 20; i++) await repo.sendFeedback({ category: "idee", message: `Idée ${i}` });
      await expect(repo.sendFeedback({ category: "idee", message: "De trop" })).rejects.toBeInstanceOf(UserFacingError);
    });
  });

  describe("placement tests", () => {
    const completed: Extract<PlacementRecord, { status: "completed" }> = {
      status: "completed",
      language: "ru",
      variant: "everyday",
      startLevel: "B2",
      estimatedLevel: "B1",
      confidence: "medium",
      chosenLevel: "C1",
      answers: [{ itemId: "ru-e-b2-1", choice: null, correct: false }],
      bankVersion: "2026-10-15",
    };

    it("lists nothing before the first test", async () => {
      expect(await repo.listPlacementTests()).toEqual([]);
    });

    it("stores a completed test, sets the level to the chosen one and lists the latest per language", async () => {
      await repo.recordPlacementTest({ ...completed, chosenLevel: "B1" });
      await repo.recordPlacementTest(completed);
      await repo.recordPlacementTest({ status: "skipped", language: "it" });

      const goals = (await repo.getPreferences())!.goals;
      expect(goals.find((g) => g.language === "ru")!.level).toBe("C1");
      expect(goals.find((g) => g.language === "it")!.level).toBe("B1");

      const tests = await repo.listPlacementTests();
      expect(tests).toHaveLength(2);
      expect(tests.find((t) => t.language === "ru")).toMatchObject({
        status: "completed",
        variant: "everyday",
        estimatedLevel: "B1",
        confidence: "medium",
        chosenLevel: "C1",
      });
      expect(tests.find((t) => t.language === "it")).toMatchObject({ status: "skipped" });
    });

    it("refuses a language the user does not study with a message for the user", async () => {
      await expect(repo.recordPlacementTest({ status: "skipped", language: "ko" })).rejects.toBeInstanceOf(
        UserFacingError,
      );
    });
  });

  describe("mission progress", () => {
    async function seedMission() {
      const { data: content } = await admin.from("contents").select("id, language").eq("language", "ru").limit(1).single();
      const date = today();
      const { data: mission, error } = await admin
        .from("missions")
        .insert({ user_id: userId, mission_date: date, budget_minutes: 30, status: "ready", generated_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error) throw error;
      const { data: session } = await admin
        .from("mission_sessions")
        .insert({
          mission_id: mission!.id,
          user_id: userId,
          position: 0,
          language: "ru",
          content_id: content!.id,
          questions: [{ id: "q1", prompt: "p", options: ["a", "b"], answerIndex: 1, explanation: "e" }],
          expressions: [{ id: "e1", text: "в разы", translation: "plusieurs fois", example: "Цены выросли в разы.", note: "familier" }],
          production: { mode: "writing", prompt: "p", hints: [] },
        })
        .select("id")
        .single();
      const inserted = await admin.from("mission_activities").insert([
        { session_id: session!.id, user_id: userId, position: 0, kind: "reading", title: "Lire", estimated_minutes: 8 },
        { session_id: session!.id, user_id: userId, position: 1, kind: "writing", title: "Écrire", estimated_minutes: 4 },
      ]);
      if (inserted.error) throw inserted.error;
      const { data: activities, error: listError } = await admin
        .from("mission_activities")
        .select("id")
        .eq("session_id", session!.id)
        .order("position");
      if (listError) throw listError;
      return { missionId: mission!.id, sessionId: session!.id, activityIds: activities!.map((a) => a.id) };
    }

    it("tracks ticks, graded answers and saved expressions, and completes the mission", async () => {
      const seeded = await seedMission();
      const mission = (await repo.getMission(today()))!;
      expect(mission.sessions[0].id).toBe(seeded.sessionId);

      await repo.setActivityDone(seeded.activityIds[0], true);
      await repo.answerQuestion(seeded.sessionId, "q1", 0);
      await repo.answerQuestion(seeded.sessionId, "q1", 1); // a second answer is ignored
      await repo.saveExpression(seeded.sessionId, "e1");
      await repo.saveExpression(seeded.sessionId, "e1"); // idempotent
      await repo.saveProduction(seeded.sessionId, "Первый черновик");
      await repo.saveProduction(seeded.sessionId, "Шум в городе мешает спать");

      const progress = await repo.getMissionProgress(mission);
      expect(progress.completedActivityIds).toEqual([seeded.activityIds[0]]);
      expect(progress.answers).toEqual({ [seeded.sessionId]: { q1: 0 } });
      expect(progress.savedExpressionIds).toEqual(["e1"]);
      expect(progress.drafts).toEqual({ [seeded.sessionId]: "Шум в городе мешает спать" });

      const words = await repo.listVocabulary();
      expect(words).toEqual([
        expect.objectContaining({
          term: "в разы",
          definition: "familier",
          addedOn: today(),
          source: expect.objectContaining({ name: expect.any(String) }),
        }),
      ]);

      const { data: row } = await admin.from("missions").select("started_at, completed_at").eq("id", seeded.missionId).single();
      expect(row!.started_at).not.toBeNull();
      expect(row!.completed_at).toBeNull();

      await repo.setActivityDone(seeded.activityIds[1], true);
      const { data: done } = await admin.from("missions").select("completed_at").eq("id", seeded.missionId).single();
      expect(done!.completed_at).not.toBeNull();

      await repo.setActivityDone(seeded.activityIds[1], false);
      const { data: reopened } = await admin.from("missions").select("completed_at").eq("id", seeded.missionId).single();
      expect(reopened!.completed_at).toBeNull();

      // Today's mission with progress shows up in the history and the study days.
      expect((await repo.getHistory()).map((h) => h.date)).toEqual([today()]);
      expect((await repo.getHistory())[0].sessions[0].writing).toBe("Шум в городе мешает спать");

      // Emptying the text removes it.
      await repo.saveProduction(seeded.sessionId, "  ");
      expect((await repo.getMissionProgress(mission)).drafts).toEqual({});
      expect(await repo.getStudyDates()).toEqual([today()]);
    });
  });

  describe("content refusals and session replacement", () => {
    // Needs at least two readable (free, active) Russian contents in the seed.
    async function seedSession(date: string) {
      const { data: contents, error: contentsError } = await admin
        .from("contents")
        .select("id, sources!inner ( access, active )")
        .eq("language", "ru")
        .eq("sources.access", "free")
        .eq("sources.active", true)
        .limit(1);
      if (contentsError) throw contentsError;
      const { data: mission, error } = await admin
        .from("missions")
        .insert({ user_id: userId, mission_date: date, budget_minutes: 12, status: "ready", generated_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error) throw error;
      const { data: session, error: sessionError } = await admin
        .from("mission_sessions")
        .insert({
          mission_id: mission!.id,
          user_id: userId,
          position: 0,
          language: "ru",
          content_id: contents![0].id,
          production: { mode: "writing", prompt: "p", hints: [] },
        })
        .select("id")
        .single();
      if (sessionError) throw sessionError;
      const inserted = await admin.from("mission_activities").insert([
        { session_id: session!.id, user_id: userId, position: 0, kind: "reading", title: "Lire", estimated_minutes: 8 },
        { session_id: session!.id, user_id: userId, position: 1, kind: "writing", title: "Écrire", estimated_minutes: 4 },
      ]);
      if (inserted.error) throw inserted.error;
      return { missionId: mission!.id, sessionId: session!.id, contentId: contents![0].id };
    }

    it("records the refusal, swaps the session and counts the replacement", async () => {
      await repo.savePreferences(PREFERENCES);
      // Only today's mission can be replaced (the daily limit is per mission).
      const past = await seedSession(addDays(today(), -9));
      await expect(repo.replaceInaccessibleContent(past.sessionId)).rejects.toBeInstanceOf(UserFacingError);
      // The mission progress tests leave a mission for today: this one takes its place.
      const cleared = await admin.from("missions").delete().eq("user_id", userId).eq("mission_date", today());
      if (cleared.error) throw cleared.error;
      const seeded = await seedSession(today());

      expect(await repo.replaceInaccessibleContent(seeded.sessionId)).toEqual({ status: "ready" });

      const { data: refusals } = await admin.from("content_refusals").select("content_id, reason").eq("user_id", userId);
      expect(refusals).toEqual([{ content_id: seeded.contentId, reason: "no_access" }]);

      const { data: sessions } = await admin
        .from("mission_sessions")
        .select("id, position, language, content_id, mission_activities ( id )")
        .eq("mission_id", seeded.missionId);
      expect(sessions).toHaveLength(1);
      expect(sessions![0].id).not.toBe(seeded.sessionId);
      expect(sessions![0]).toMatchObject({ position: 0, language: "ru" });
      expect(sessions![0].content_id).not.toBe(seeded.contentId);
      expect(sessions![0].mission_activities.length).toBeGreaterThan(0);

      const { data: mission } = await admin.from("missions").select("session_replacements, generation_meta").eq("id", seeded.missionId).single();
      expect(mission!.session_replacements).toBe(1);
      expect((mission!.generation_meta as { replacements: unknown[] }).replacements).toHaveLength(1);

      // The old session is gone: asking again for it is a message for the user.
      await expect(repo.replaceInaccessibleContent(seeded.sessionId)).rejects.toBeInstanceOf(UserFacingError);
    });

    it("reserves before replacing: not the user's, not reserved, in progress, past the limit", async () => {
      const seeded = await seedSession(addDays(today(), -10));
      const session: Json = {
        language: "ru",
        contentId: seeded.contentId,
        questions: [],
        expressions: [],
        production: { mode: "writing", prompt: "p", hints: [] },
        activities: [{ kind: "reading", title: "Lire", estimatedMinutes: 5 }],
      };
      const replace = (overrides: { p_user_id?: string; p_session?: Json } = {}) =>
        admin.rpc("replace_mission_session", {
          p_session_id: seeded.sessionId,
          p_user_id: userId,
          p_session: session,
          p_meta: {},
          ...overrides,
        });
      const reserve = (overrides: { p_user_id?: string; p_max_per_day?: number } = {}) =>
        admin.rpc("reserve_session_replacement", { p_session_id: seeded.sessionId, p_user_id: userId, ...overrides });

      // Not the user's session.
      expect((await reserve({ p_user_id: crypto.randomUUID() })).error?.code).toBe("P0002");
      expect((await replace({ p_user_id: crypto.randomUUID() })).error?.code).toBe("P0002");
      // Replacing without a reservation.
      expect((await replace()).error?.code).toBe("55000");
      // Limit reached: nothing is reserved.
      expect((await reserve({ p_max_per_day: 0 })).error?.code).toBe("DL001");
      // Reserved, then a second reservation of the same session is refused.
      expect((await reserve()).error).toBeNull();
      expect((await reserve()).error?.code).toBe("DL002");
      // A released session can be reserved again; the slot stays consumed.
      expect((await admin.rpc("release_session_replacement", { p_session_id: seeded.sessionId })).error).toBeNull();
      expect((await reserve()).error).toBeNull();
      const { data: mission } = await admin.from("missions").select("session_replacements").eq("id", seeded.missionId).single();
      expect(mission!.session_replacements).toBe(2);
      // Reserved: the replacement itself checks the content, then swaps.
      expect((await replace({ p_session: { ...(session as object), language: "it" } })).error?.code).toBe("23514");
      expect((await replace()).error).toBeNull();
    });
  });
});

describe.skipIf(!stackIsUp)("Account deletion (local database, throw-away user)", () => {
  it("removes the user and all their personal data, and keeps shared content", async () => {
    const admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    const created = await admin.auth.admin.createUser({
      email: `delete-${Date.now()}@test.invalid`,
      password: `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    const id = created.data.user.id;
    await admin.from("user_languages").insert({ user_id: id, language: "ru", level: "B2", target_level: "C1" });
    await admin
      .from("vocabulary_items")
      .insert({ user_id: id, language: "ru", term: "слово", translation: "mot", due_on: "2030-01-01", added_on: "2030-01-01" });
    const { count: contentsBefore } = await admin.from("contents").select("id", { count: "exact", head: true });

    await deleteUserAccount(id);

    const words = await admin.from("vocabulary_items").select("id").eq("user_id", id);
    const profile = await admin.from("profiles").select("id").eq("id", id);
    const languages = await admin.from("user_languages").select("id").eq("user_id", id);
    expect([words.data, profile.data, languages.data]).toEqual([[], [], []]);
    const { count: contentsAfter } = await admin.from("contents").select("id", { count: "exact", head: true });
    expect(contentsAfter).toBe(contentsBefore);
  });
});

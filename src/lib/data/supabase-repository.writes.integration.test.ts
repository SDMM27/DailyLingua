import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toDateKey } from "@/lib/domain/dates";
import type { PlacementRecord } from "@/lib/schemas/placement";
import type { Preferences } from "@/lib/schemas/preferences";
import type { Database } from "@/lib/supabase/database.types";
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
    { language: "ru", level: "B2", targetLevel: "C1", focus: "", purpose: "general", weight: 2 },
    { language: "it", level: "B1", targetLevel: "B2", focus: "", purpose: "general", weight: 1 },
  ],
  dailyMinutes: 30,
  topics: ["société"],
  contentTypes: ["article"],
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: TIME_ZONE,
};

const stackIsUp = await localStackIsUp();

describe.skipIf(!stackIsUp)("Supabase repository writes (local database, throw-away user)", () => {
  let admin: SupabaseClient<Database>;
  let userId: string;
  let repo: ReturnType<typeof createSupabaseRepository>;
  const today = () => toDateKey(new Date(), TIME_ZONE);

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    const email = `writes-${Date.now()}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;

    const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    repo = createSupabaseRepository(client, userId);
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

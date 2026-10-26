import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ALPHABETS } from "@/lib/alphabets";
import { buildAlphabetCheck } from "@/lib/domain/alphabet";
import { GRAMMAR_MASTERED_BOX } from "@/lib/domain/grammar";
import { addDays, toDateKey } from "@/lib/domain/dates";
import { createSessionReplacer } from "@/lib/generation/preparer";
import { createTemplateGenerator } from "@/lib/generation/template-generator";
import { createSupabaseVocabularyTranslationStore } from "@/lib/generation/vocabulary-translation";
import type { PlacementRecord } from "@/lib/schemas/placement";
import type { Preferences } from "@/lib/schemas/preferences";
import type { Database, Json } from "@/lib/supabase/database.types";
import { deleteUserAccount } from "@/lib/supabase/delete-account";
import { UserFacingError } from "./errors";
import { createSupabaseRepository } from "./supabase-repository";

// The real courses are content that changes on its own: the grammar tests use a fixture point.
vi.mock("@/lib/grammar/courses", async () => {
  const { FIXTURE_POINT } = await import("@/test/grammar-fixtures");
  const course = { language: "it", version: "2026-10-21", points: [FIXTURE_POINT] };
  return {
    GRAMMAR_COURSES: { it: course },
    grammarPoint: (id: string) => course.points.find((p) => p.id === id),
    grammarLanguages: () => ["it"],
  };
});

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
  showStreak: true,
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

  it("saves the day streak preference, and an old payload without it shows the streak again", async () => {
    await repo.savePreferences({ ...PREFERENCES, showStreak: false });
    expect((await repo.getPreferences())!.showStreak).toBe(false);
    const { error } = await userClient.rpc("save_preferences", {
      p_daily_minutes: 30,
      p_topics: null,
      p_content_types: null,
      p_difficulty: "matched",
      p_generation_time: "07:00",
      p_time_zone: TIME_ZONE,
      p_goals: PREFERENCES.goals.map((g) => ({
        language: g.language, level: g.level, target_level: g.targetLevel, focus: "", purpose: "general", weight: g.weight,
      })),
    });
    expect(error).toBeNull();
    expect((await repo.getPreferences())!.showStreak).toBe(true);
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
      const reviewed = await repo.reviewVocabulary({ id: item.id, grade: "good", expectedReviewCount: 0, mode: "translate" });
      // A first review has no previous one: it does not count for the retention.
      expect((await repo.vocabularyRetention()).total).toEqual({ reviews: 0, recalled: 0 });
      expect(reviewed.review).toMatchObject({ box: 1, lastReviewedOn: today(), reviewCount: 1 });
      expect((await repo.listVocabulary())[0].review).toEqual(reviewed.review);

      await expect(
        repo.reviewVocabulary({ id: item.id, grade: "good", expectedReviewCount: 0, mode: "flip" }),
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

  describe("vocabulary lists", () => {
    it("creates, renames, pauses and lists a list", async () => {
      const created = await repo.createVocabularyList({ language: "it", name: "Livre", description: "Chapitre 1" });
      expect(created).toMatchObject({ language: "it", name: "Livre", description: "Chapitre 1", active: true });

      const renamed = await repo.updateVocabularyList({ id: created.id, name: "Il libro", description: "", active: false });
      expect(renamed).toEqual({ id: created.id, language: "it", name: "Il libro", active: false });
      expect(await repo.listVocabularyLists()).toEqual([renamed]);
      await expect(repo.updateVocabularyList({ id: "00000000-0000-4000-8000-000000000000", active: true })).rejects.toBeInstanceOf(
        UserFacingError,
      );
    });

    it("refuses a name already used with a message for the user", async () => {
      await expect(repo.createVocabularyList({ language: "ru", name: "Il libro" })).rejects.toThrow("Tu as déjà une liste de ce nom.");
    });

    it("accepts a word in a list of its language only", async () => {
      const [list] = await repo.listVocabularyLists();
      const word = await repo.addVocabulary({ language: "it", term: "ciao", translation: "salut", listId: list.id });
      expect(word.listId).toBe(list.id);
      await expect(
        repo.addVocabulary({ language: "ru", term: "привет", translation: "salut", listId: list.id }),
      ).rejects.toBeInstanceOf(UserFacingError);
    });

    it("imports into a new list, skipping words already there whatever their case", async () => {
      const result = await repo.importVocabulary({
        language: "it",
        newListName: "Cours",
        entries: [
          { term: "CIAO", translation: "salut" },
          { term: "grazie", translation: "merci", example: "Grazie mille!" },
          { term: "Prego", translation: "de rien" },
          { term: "prego ", translation: "de rien" },
        ],
      });
      expect(result.added.map((i) => i.term)).toEqual(["grazie", "Prego"]);
      expect(result.skipped).toEqual(["CIAO", "prego "]);
      expect(result.list).toMatchObject({ name: "Cours", language: "it", active: true });
      expect(result.added[0]).toMatchObject({ example: "Grazie mille!", listId: result.list!.id });
      expect(result.added[0].review).toEqual({ box: 0, dueOn: today(), lastReviewedOn: null, reviewCount: 0 });

      // Nothing new: no list is created.
      const again = await repo.importVocabulary({
        language: "it",
        newListName: "Autre",
        entries: [{ term: "grazie", translation: "merci" }],
      });
      expect(again).toEqual({ added: [], skipped: ["grazie"] });
      expect((await repo.listVocabularyLists()).map((l) => l.name)).not.toContain("Autre");
    });

    it("refuses an import into a list of another language, or one that does not exist", async () => {
      const [list] = await repo.listVocabularyLists();
      await expect(
        repo.importVocabulary({ language: "ru", listId: list.id, entries: [{ term: "привет", translation: "salut" }] }),
      ).rejects.toBeInstanceOf(UserFacingError);
      await expect(
        repo.importVocabulary({
          language: "it",
          listId: "00000000-0000-4000-8000-000000000000",
          entries: [{ term: "nuovo", translation: "nouveau" }],
        }),
      ).rejects.toBeInstanceOf(UserFacingError);
    });

    it("deletes a list with its words", async () => {
      const lists = await repo.listVocabularyLists();
      const cours = lists.find((l) => l.name === "Cours")!;
      await repo.deleteVocabularyList(cours.id);
      const words = await repo.listVocabulary();
      expect(words.some((w) => w.listId === cours.id)).toBe(false);
      expect(words.map((w) => w.term)).toEqual(["ciao"]);
      await repo.deleteVocabularyList(lists.find((l) => l.name === "Il libro")!.id);
      expect(await repo.listVocabulary()).toEqual([]);
      expect(await repo.listVocabularyLists()).toEqual([]);
    });

    it("reserves translations against the daily limit with the service role", async () => {
      const store = createSupabaseVocabularyTranslationStore(admin);
      expect(await store.claim(userId, "2030-05-01", 150, 200)).toBe(true);
      expect(await store.claim(userId, "2030-05-01", 51, 200)).toBe(false);
      expect(await store.claim(userId, "2030-05-01", 50, 200)).toBe(true);
      expect(await store.claim(userId, "2030-05-02", 50, 200)).toBe(true);
    });

    it("keeps the usage table and the claim function closed to the user", async () => {
      expect((await userClient.from("vocabulary_translation_usage").select("*")).error).not.toBeNull();
      expect(
        (await userClient.rpc("claim_vocabulary_translation", { p_user_id: userId, p_day: "2030-05-03", p_terms: 1, p_limit: 200 })).error,
      ).not.toBeNull();
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
      startLevel: "B2",
      estimatedLevel: "B1",
      confidence: "medium",
      chosenLevel: "C1",
      answers: [{ itemId: "ru-b2-1", choice: null, correct: false }],
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

  describe("written productions and correction cards", () => {
    const score = { score: 3, comment: "Ok." };
    const feedback = {
      scores: { grammar: score, vocabulary: score, register: score, coherence: score },
      corrections: [
        { original: "мешают", corrected: "мешает", explanation: "Accord.", category: "verb" },
        { original: "Шум в город", corrected: "Шум в городе", explanation: "Prépositionnel.", category: "spelling" },
      ],
      strength: "Clair.",
      nativeVersion: "Шум в городе мешает спать.",
    };

    // Relies on the mission of today seeded by the previous describe (one Russian session).
    it("lists productions, keeps corrections as cards and adds recurring errors by itself", async () => {
      const sessionId = (await repo.getMission(today()))!.sessions[0].id;
      const text = "Шум в город мешают спать";

      // An older review of the same language, with a verb error: the verb error is now recurring.
      const { data: older, error } = await admin
        .from("missions")
        .insert({ user_id: userId, mission_date: addDays(today(), -1), budget_minutes: 30, status: "ready", generated_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error) throw error;
      const { data: content } = await admin.from("contents").select("id").eq("language", "ru").limit(1).single();
      const { data: olderSession } = await admin
        .from("mission_sessions")
        .insert({ mission_id: older!.id, user_id: userId, position: 0, language: "ru", content_id: content!.id, production: { mode: "writing", prompt: "p", hints: [] } })
        .select("id")
        .single();
      await admin.from("production_entries").insert({ session_id: olderSession!.id, user_id: userId, body: "Старый текст" });
      await admin.from("writing_feedback").insert({
        session_id: olderSession!.id,
        user_id: userId,
        attempts: 1,
        body: "Старый текст",
        feedback: { ...feedback, corrections: [feedback.corrections[0]] } as Json,
        reviewed_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      });

      // The review of today is written by the service (here by the fake reviewer, after the draft).
      await admin.from("writing_feedback").upsert({
        session_id: sessionId,
        user_id: userId,
        attempts: 1,
        body: text,
        feedback: feedback as Json,
        reviewed_at: new Date().toISOString(),
      });
      const reviewing = createSupabaseRepository(userClient, userId, {
        reviewWriting: async () => ({ status: "ready", feedback: feedback as never, reviewedText: text, attemptsLeft: 2 }),
      });
      expect((await reviewing.requestWritingFeedback(sessionId, text)).status).toBe("ready");

      // Only the verb error (seen in the older review) became a card.
      expect((await repo.listCorrectionCards()).map((c) => [c.correctionIndex, c.category, c.review.dueOn])).toEqual([
        [0, "verb", today()],
      ]);

      const productions = await repo.listProductions();
      expect(productions.map((p) => p.sessionId)).toEqual([sessionId, olderSession!.id]);
      expect(productions[0]).toMatchObject({
        language: "ru",
        body: text,
        task: "p",
        cardIndexes: [0],
        feedback: { nativeVersion: "Шум в городе мешает спать." },
      });

      // On demand: idempotent, and refused for a correction that does not exist.
      await repo.addCorrectionCard(sessionId, 1);
      await repo.addCorrectionCard(sessionId, 1);
      expect((await repo.listCorrectionCards()).map((c) => c.correctionIndex)).toEqual([0, 1]);
      await expect(repo.addCorrectionCard(sessionId, 5)).rejects.toBeInstanceOf(UserFacingError);

      // Review: moves the card on, refuses a stale count, deletion removes it.
      const [card] = await repo.listCorrectionCards();
      const reviewed = await repo.reviewCorrectionCard({ id: card.id, grade: "good", expectedReviewCount: 0 });
      expect(reviewed.review).toMatchObject({ box: 1, reviewCount: 1, lastReviewedOn: today() });
      await expect(
        repo.reviewCorrectionCard({ id: card.id, grade: "good", expectedReviewCount: 0 }),
      ).rejects.toBeInstanceOf(UserFacingError);
      await repo.deleteCorrectionCard(card.id);
      expect((await repo.listCorrectionCards()).map((c) => c.correctionIndex)).toEqual([1]);
    });
  });

  describe("grammar cards", () => {
    const pointId = "it-a1-present";

    it("creates a card on a pass, reviews it when due, refuses stale counts and keeps cards private", async () => {
      expect(await repo.listGrammarCards()).toEqual([]);

      // Refused: unknown point, wrong number of exercises, card unexpectedly there / missing.
      await expect(
        repo.recordGrammarPractice({ pointId: "it-a1-unknown", correct: 3, total: 3, expectedReviewCount: null }),
      ).rejects.toBeInstanceOf(UserFacingError);
      await expect(
        repo.recordGrammarPractice({ pointId, correct: 3, total: 3, expectedReviewCount: 1 }),
      ).rejects.toBeInstanceOf(UserFacingError);

      // Below 60 %: nothing is recorded.
      expect(await repo.recordGrammarPractice({ pointId, correct: 1, total: 3, expectedReviewCount: null })).toEqual({
        outcome: "not-passed",
        card: null,
      });
      expect(await repo.listGrammarCards()).toEqual([]);

      // A pass creates the card (box 1 after a perfect score), due in two days.
      const created = await repo.recordGrammarPractice({ pointId, correct: 3, total: 3, expectedReviewCount: null });
      expect(created.outcome).toBe("created");
      expect(created.card).toMatchObject({
        pointId,
        language: "it",
        status: "learning",
        addedOn: today(),
        review: { box: 1, dueOn: addDays(today(), 2), lastReviewedOn: today(), reviewCount: 1 },
      });

      // The same page opened twice: a second creation is refused.
      await expect(
        repo.recordGrammarPractice({ pointId, correct: 3, total: 3, expectedReviewCount: null }),
      ).rejects.toBeInstanceOf(UserFacingError);

      // Not due yet: free practice, nothing changes.
      expect(await repo.recordGrammarPractice({ pointId, correct: 3, total: 3, expectedReviewCount: 1 })).toMatchObject({
        outcome: "practice",
        card: { review: { reviewCount: 1 } },
      });

      // Due: reviewed. A stale count is refused.
      const [card] = await repo.listGrammarCards();
      await admin.from("grammar_cards").update({ due_on: today() }).eq("id", card.id);
      await expect(
        repo.recordGrammarPractice({ pointId, correct: 3, total: 3, expectedReviewCount: 0 }),
      ).rejects.toBeInstanceOf(UserFacingError);
      const reviewed = await repo.recordGrammarPractice({ pointId, correct: 3, total: 3, expectedReviewCount: 1 });
      expect(reviewed.outcome).toBe("reviewed");
      expect(reviewed.card?.review).toMatchObject({ box: 2, reviewCount: 2, lastReviewedOn: today() });
      await expect(
        repo.recordGrammarPractice({ pointId, correct: 3, total: 3, expectedReviewCount: 1 }),
      ).rejects.toBeInstanceOf(UserFacingError);

      // Another user sees nothing, cannot move the card, and deleting it removes it.
      const email = `grammar-${Date.now()}@test.invalid`;
      const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      const other = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (other.error) throw other.error;
      try {
        const otherClient = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
        const signedIn = await otherClient.auth.signInWithPassword({ email, password });
        if (signedIn.error) throw signedIn.error;
        const otherRepo = createSupabaseRepository(otherClient, other.data.user.id);
        expect(await otherRepo.listGrammarCards()).toEqual([]);
        const { data: moved } = await otherClient.rpc("record_grammar_practice", {
          p_point_id: pointId,
          p_language: "it",
          p_practised_on: today(),
          p_box_after: 5,
          p_due_on_after: addDays(today(), 60),
          p_expected_review_count: 2,
        });
        expect(moved).toBe(false);
        await otherRepo.deleteGrammarCard(card.id);
      } finally {
        await admin.auth.admin.deleteUser(other.data.user.id);
      }
      expect(await repo.listGrammarCards()).toHaveLength(1);

      await repo.deleteGrammarCard(card.id);
      expect(await repo.listGrammarCards()).toEqual([]);
    });
  });

  describe("alphabet cards", () => {
    // Russian group 1 has 6 letters: a run is 6 + 3 + 2 questions (2 fewer without a local voice).
    const groupId = "ru-alphabet-1";
    const total = 11;

    it("creates a card on a pass, reviews it when due, refuses stale counts and keeps cards private", async () => {
      expect(await repo.listAlphabetCards()).toEqual([]);

      // Refused: unknown group, wrong number of questions, card unexpectedly there / missing.
      await expect(
        repo.recordAlphabetPractice({ groupId: "ru-alphabet-9", correct: total, total, expectedReviewCount: null }),
      ).rejects.toBeInstanceOf(UserFacingError);
      await expect(
        repo.recordAlphabetPractice({ groupId, correct: 3, total: 3, expectedReviewCount: null }),
      ).rejects.toBeInstanceOf(UserFacingError);
      await expect(
        repo.recordAlphabetPractice({ groupId, correct: total, total, expectedReviewCount: 1 }),
      ).rejects.toBeInstanceOf(UserFacingError);

      // Below 60 %: nothing is recorded.
      expect(await repo.recordAlphabetPractice({ groupId, correct: 3, total, expectedReviewCount: null })).toEqual({
        outcome: "not-passed",
        card: null,
      });
      expect(await repo.listAlphabetCards()).toEqual([]);

      // A pass creates the card (box 1 after a perfect score), due in two days.
      const created = await repo.recordAlphabetPractice({ groupId, correct: total, total, expectedReviewCount: null });
      expect(created.outcome).toBe("created");
      expect(created.card).toMatchObject({
        groupId,
        language: "ru",
        status: "learning",
        addedOn: today(),
        review: { box: 1, dueOn: addDays(today(), 2), lastReviewedOn: today(), reviewCount: 1 },
      });

      // The same page opened twice: a second creation is refused.
      await expect(
        repo.recordAlphabetPractice({ groupId, correct: total, total, expectedReviewCount: null }),
      ).rejects.toBeInstanceOf(UserFacingError);

      // Not due yet: free practice, nothing changes.
      expect(await repo.recordAlphabetPractice({ groupId, correct: total, total, expectedReviewCount: 1 })).toMatchObject({
        outcome: "practice",
        card: { review: { reviewCount: 1 } },
      });

      // Due: reviewed. A stale count is refused.
      const [card] = await repo.listAlphabetCards();
      await admin.from("alphabet_cards").update({ due_on: today() }).eq("id", card.id);
      await expect(
        repo.recordAlphabetPractice({ groupId, correct: total, total, expectedReviewCount: 0 }),
      ).rejects.toBeInstanceOf(UserFacingError);
      const reviewed = await repo.recordAlphabetPractice({ groupId, correct: total, total, expectedReviewCount: 1 });
      expect(reviewed.outcome).toBe("reviewed");
      expect(reviewed.card?.review).toMatchObject({ box: 2, reviewCount: 2, lastReviewedOn: today() });

      // Another user sees nothing and cannot move the card.
      const email = `alphabet-${Date.now()}@test.invalid`;
      const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      const other = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (other.error) throw other.error;
      try {
        const otherClient = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
        const signedIn = await otherClient.auth.signInWithPassword({ email, password });
        if (signedIn.error) throw signedIn.error;
        const otherRepo = createSupabaseRepository(otherClient, other.data.user.id);
        expect(await otherRepo.listAlphabetCards()).toEqual([]);
        const { data: moved } = await otherClient.rpc("record_alphabet_practice", {
          p_group_id: groupId,
          p_language: "ru",
          p_practised_on: today(),
          p_box_after: 5,
          p_due_on_after: addDays(today(), 60),
          p_expected_review_count: 2,
        });
        expect(moved).toBe(false);
      } finally {
        await admin.auth.admin.deleteUser(other.data.user.id);
      }
      expect(await repo.listAlphabetCards()).toHaveLength(1);
    });
  });

  describe("alphabet reading check", () => {
    const alphabet = ALPHABETS.uk!;
    const [first, ...others] = alphabet.groups;
    const answersOf = (day: string) => buildAlphabetCheck(alphabet, `check:${day}`).map((e) => e.answer);
    const ukCards = async () => (await repo.listAlphabetCards()).filter((c) => c.language === "uk");

    it("marks the groups without a card as known on a pass, and only then", async () => {
      const day = today();
      const right = answersOf(day);

      // Refused: unknown alphabet, a day that is neither today nor yesterday.
      await expect(repo.recordAlphabetCheck({ language: "it", day, choices: right })).rejects.toBeInstanceOf(UserFacingError);
      await expect(
        repo.recordAlphabetCheck({ language: "uk", day: addDays(day, -2), choices: answersOf(addDays(day, -2)) }),
      ).rejects.toBeInstanceOf(UserFacingError);

      // Below 90 %, « Je ne sais pas » and a wrong number of answers: nothing is recorded.
      const wrong = right.map((c, i) => (i < 2 ? (c + 1) % 4 : c));
      expect(await repo.recordAlphabetCheck({ language: "uk", day, choices: wrong })).toEqual({
        correct: 8,
        total: 10,
        passed: false,
        marked: 0,
      });
      expect(await repo.recordAlphabetCheck({ language: "uk", day, choices: right.map((c, i) => (i < 2 ? null : c)) })).toMatchObject({
        passed: false,
        marked: 0,
      });
      expect(await repo.recordAlphabetCheck({ language: "uk", day, choices: right.slice(1) })).toMatchObject({ passed: false, marked: 0 });
      expect(await ukCards()).toEqual([]);

      // The first group already has a card: it stays as it is.
      const { error } = await admin.from("alphabet_cards").insert({
        user_id: userId,
        group_id: first.id,
        language: "uk",
        status: "learning",
        box: 1,
        due_on: addDays(day, 2),
        last_reviewed_on: day,
        review_count: 3,
        added_on: addDays(day, -5),
      });
      expect(error).toBeNull();

      // One answer off is still a pass: every other group gets a card, mastered.
      const almost = right.map((c, i) => (i === 0 ? (c + 1) % 4 : c));
      const passed = await repo.recordAlphabetCheck({ language: "uk", day, choices: almost });
      expect(passed).toEqual({ correct: 9, total: 10, passed: true, marked: others.length });
      const cards = await ukCards();
      expect(cards).toHaveLength(alphabet.groups.length);
      expect(cards.find((c) => c.groupId === first.id)).toMatchObject({
        status: "learning",
        addedOn: addDays(day, -5),
        review: { box: 1, reviewCount: 3 },
      });
      for (const group of others) {
        expect(cards.find((c) => c.groupId === group.id)).toMatchObject({
          language: "uk",
          status: "known",
          addedOn: day,
          review: { box: GRAMMAR_MASTERED_BOX, dueOn: addDays(day, 16), lastReviewedOn: day, reviewCount: 0 },
        });
      }

      // Again: nothing new to mark.
      expect(await repo.recordAlphabetCheck({ language: "uk", day, choices: right })).toMatchObject({ passed: true, marked: 0 });
    });
  });

  describe("content refusals and session replacement", () => {
    // Its own feed source (the seed's sources have no key, so they are never candidates) with two
    // free Russian contents: one for the session, one to replace it.
    const runId = crypto.randomUUID().slice(0, 8);
    let sourceId = "";
    let contentIds: string[] = [];

    beforeAll(async () => {
      const source = await admin
        .from("sources")
        .insert({
          key: `test-refusal-${runId}`,
          name: "Source test refus",
          language: "ru",
          homepage_url: `https://test-refusal-${runId}.example.invalid/`,
          feed_url: `https://test-refusal-${runId}.example.invalid/feed`,
          access: "free",
          content_type: "article",
          license_kind: "all-rights-reserved",
          license_name: "Tous droits réservés",
          terms_url: "https://example.invalid/terms",
          license_verified_on: "2026-10-01",
          commercial_use: false,
          active: true,
        })
        .select("id")
        .single();
      if (source.error) throw source.error;
      sourceId = source.data.id;
      const contents = await admin
        .from("contents")
        .insert(
          [1, 2].map((n) => ({
            source_id: sourceId,
            language: "ru",
            content_type: "article",
            title: `Titre test refus ${n} ${runId}`,
            url: `https://test-refusal-${runId}.example.invalid/${n}`,
            difficulty: "B2",
            duration_minutes: 4,
            summary: `Résumé de l’article ${n}, publié par une source de test.`,
            // Newer than anything else, so these are the first candidates.
            published_at: new Date(Date.now() + 3_600_000 - n * 60_000).toISOString(),
          })),
        )
        .select("id");
      if (contents.error) throw contents.error;
      contentIds = contents.data.map((c) => c.id);
    });

    afterAll(async () => {
      // Sessions reference the contents without cascade: the user's missions go first.
      await admin.from("missions").delete().eq("user_id", userId);
      await admin.from("contents").delete().in("id", contentIds);
      await admin.from("sources").delete().eq("id", sourceId);
    });

    async function seedSession(date: string) {
      const contents = [{ id: contentIds[0] }];
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

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import { UserFacingError } from "@/lib/data/errors";
import type { Preferences } from "@/lib/schemas/preferences";
import type { Database } from "@/lib/supabase/database.types";
import { AssessmentNotFoundError, createSupabaseAssessmentStore } from "./supabase-store";

/**
 * Integration test of the assessment data against the LOCAL Supabase stack, on a throw-away user
 * (deleted afterwards, which deletes its assessments). Skipped when the local stack or the service
 * role key is missing.
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
  goals: [
    { language: "ru", level: "B2", targetLevel: "C1", focus: "", purpose: "general", weight: 20, days: [1, 2, 3, 4, 5, 6, 7], topics: ["société"], contentTypes: ["article"] },
    { language: "it", level: "B1", targetLevel: "B2", focus: "", purpose: "general", weight: 10, days: [1, 2, 3, 4, 5, 6, 7], topics: ["société"], contentTypes: ["article"] },
  ],
  dailyMinutes: 30,
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: "Europe/Paris",
  showStreak: true,
};

const RESULTS = {
  reading: { level: "B2", confidence: "high" },
  listening: null,
  writing: { level: "B1", confidence: "medium" },
  speaking: { level: "B2", confidence: "low", declared: true },
} as const;

const stackIsUp = await localStackIsUp();

describe.skipIf(!stackIsUp)("Assessments (local database, throw-away data)", () => {
  const runId = `${Date.now()}`;
  let admin: SupabaseClient<Database>;
  let userId: string;
  let repo: ReturnType<typeof createSupabaseRepository>;
  let store: ReturnType<typeof createSupabaseAssessmentStore>;

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    store = createSupabaseAssessmentStore(admin);
    const email = `assessment-${runId}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${runId}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;

    const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    repo = createSupabaseRepository(client, userId);
    await repo.savePreferences(PREFERENCES);
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("starts, resumes, saves, claims, completes and rereads an assessment", async () => {
    expect(await repo.getCurrentAssessment("ru")).toBeNull();

    const id = await repo.startAssessment("ru", "ru-b2-1");
    expect(await repo.startAssessment("ru", "ru-b2-2")).toBe(id);
    const started = await repo.getCurrentAssessment("ru");
    expect(started).toMatchObject({ id, dossierId: "ru-b2-1", status: "in_progress", listeningPlays: 0, results: null, gradedAt: null });
    expect(started?.answers).toEqual({ questions: {}, writing: "", speaking: {} });

    await repo.saveAssessmentAnswers(id, { questions: { q1: "réponse" }, writing: "Texte", speaking: { s1: true } }, 2);
    await repo.saveAssessmentAnswers(id, { questions: { q1: "réponse", q2: "autre" }, writing: "Texte", speaking: { s1: true } }, 1);
    const saved = await repo.getCurrentAssessment("ru");
    expect(saved?.listeningPlays).toBe(2);
    expect(saved?.answers.questions).toEqual({ q1: "réponse", q2: "autre" });

    expect(await store.claimGrading(id, userId)).toBe(1);
    await store.completeGrading({
      assessmentId: id,
      userId,
      results: RESULTS,
      productionLevel: "B1",
      model: "test-model",
      promptVersion: "test",
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    expect(await repo.getCurrentAssessment("ru")).toBeNull();
    const [graded] = await repo.listAssessments("ru");
    expect(graded).toMatchObject({ id, status: "graded", results: RESULTS });
    expect(graded.gradedAt).not.toBeNull();
    expect(await repo.listAssessments("it")).toEqual([]);
    expect((await repo.getPreferences())?.goals.find((g) => g.language === "ru")?.productionLevel).toBe("B1");

    // A graded assessment is closed, for the owner and for the grader alike.
    await expect(repo.saveAssessmentAnswers(id, { questions: {}, writing: "", speaking: {} }, 3)).rejects.toBeInstanceOf(UserFacingError);
    await expect(store.claimGrading(id, userId)).rejects.toBeInstanceOf(AssessmentNotFoundError);

    // A new assessment can start once the previous one is graded; history lists the newest first.
    const next = await repo.startAssessment("ru", "ru-b2-2");
    expect(next).not.toBe(id);
    expect((await repo.listAssessments()).map((a) => a.id)).toEqual([next, id]);
  });

  it("keeps the production level when the preferences are saved again", async () => {
    const preferences = (await repo.getPreferences())!;
    await repo.savePreferences({ ...preferences, difficulty: "challenge" });
    expect((await repo.getPreferences())?.goals.find((g) => g.language === "ru")?.productionLevel).toBe("B1");
  });

  it("refuses a language the user does not study, and a dossier of another language", async () => {
    await expect(repo.startAssessment("es", "es-a1-1")).rejects.toBeInstanceOf(UserFacingError);
    await expect(repo.startAssessment("it", "ru-b2-1")).rejects.toBeInstanceOf(UserFacingError);
  });

});

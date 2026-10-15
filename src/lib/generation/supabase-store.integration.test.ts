import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import { addDays, toDateKey } from "@/lib/domain/dates";
import { splitBudget } from "@/lib/domain/time-budget";
import type { CefrLevel, Language } from "@/lib/schemas/common";
import type { ExerciseGenerator, GenerationRequest, WireSession } from "@/lib/schemas/generation";
import { missionSchema } from "@/lib/schemas/mission";
import type { Preferences } from "@/lib/schemas/preferences";
import type { Database } from "@/lib/supabase/database.types";
import { generateMission } from "./generate-mission";
import { createSupabaseMissionStore } from "./supabase-store";
import { createTemplateGenerator } from "./template-generator";

/**
 * Integration tests of the mission store against the LOCAL Supabase stack, on a throw-away user,
 * sources and contents (all deleted afterwards). Skipped when the local stack or the service role
 * key is missing.
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

describe.skipIf(!stackIsUp)("Supabase mission store (local database, throw-away data)", () => {
  const runId = `${Date.now()}`;
  const levels: Partial<Record<Language, CefrLevel>> = { ru: "B2", it: "B1" };
  let admin: SupabaseClient<Database>;
  let client: SupabaseClient<Database>;
  let userId: string;
  let repo: ReturnType<typeof createSupabaseRepository>;
  const sourceIds: string[] = [];
  const contentIds: string[] = [];
  const titles = new Set<string>();
  const store = () => createSupabaseMissionStore(admin, { policy: "all" });
  const today = toDateKey(new Date(), TIME_ZONE);
  const tomorrow = addDays(today, 1);
  const mine = <T extends { title: string }>(items: T[]) => items.filter((item) => titles.has(item.title));

  async function createSource(language: Language) {
    const { data, error } = await admin
      .from("sources")
      .insert({
        key: `test-${language}-${runId}`,
        name: `Source test ${language}`,
        language,
        homepage_url: `https://test-${language}-${runId}.example.invalid/`,
        feed_url: `https://test-${language}-${runId}.example.invalid/feed`,
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
    if (error) throw error;
    sourceIds.push(data.id);
    return data.id;
  }

  async function createContents(language: Language, sourceId: string, count: number) {
    const rows = Array.from({ length: count }, (_, n) => {
      const title = `Titre test ${language} ${n + 1} ${runId}`;
      titles.add(title);
      return {
        source_id: sourceId,
        language,
        content_type: "article",
        title,
        url: `https://test-${language}-${runId}.example.invalid/${n + 1}`,
        difficulty: levels[language]!,
        duration_minutes: 4,
        summary: `Résumé de l’article ${n + 1} en ${language}, publié par une source de test.`,
        // Newer than anything another test run may have inserted in the same languages.
        published_at: new Date(Date.now() + 3_600_000 - n * 60_000).toISOString(),
      };
    });
    const { data, error } = await admin.from("contents").insert(rows).select("id");
    if (error) throw error;
    contentIds.push(...data.map((c) => c.id));
  }

  /** Valid exercises for every requested session, on its first candidate. */
  const fakeAi: ExerciseGenerator = {
    name: "fake-ai",
    async generate(request: GenerationRequest) {
      const sessions: WireSession[] = request.sessions.map((s) => ({
        language: s.language,
        candidateIndex: 0,
        questions: [
          {
            prompt: `Question sur ${s.candidates[0].title} ?`,
            options: ["Option A", "Option B", "Option C"],
            answerIndex: 1,
            explanation_fr: "Parce que l’accroche le dit.",
          },
        ],
        expressions: [
          { text: "expression un", translation_fr: "expression un (fr)", example: "Exemple un.", note_fr: "" },
          { text: "expression deux", translation_fr: "expression deux (fr)", example: "Exemple deux.", note_fr: "" },
          { text: "expression trois", translation_fr: "expression trois (fr)", example: "Exemple trois.", note_fr: "usage" },
        ],
        production: { prompt: "Écris quelques phrases.", hints_fr: ["Un", "Deux"] },
      }));
      return {
        source: "ai",
        model: "fake-model",
        promptVersion: "test",
        sessions,
        usage: { inputTokens: 10, outputTokens: 20 },
      };
    },
  };

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
    const email = `generation-${runId}@test.invalid`;
    const password = `pw-${Math.random().toString(36).slice(2)}-${runId}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;

    client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    repo = createSupabaseRepository(client, userId);
    await repo.savePreferences(PREFERENCES);

    await createContents("ru", await createSource("ru"), 3);
    await createContents("it", await createSource("it"), 3);
  });

  afterAll(async () => {
    // The user first: deleting it cascades to its missions, which reference the contents.
    if (userId) await admin.auth.admin.deleteUser(userId);
    if (contentIds.length > 0) await admin.from("contents").delete().in("id", contentIds);
    if (sourceIds.length > 0) await admin.from("sources").delete().in("id", sourceIds);
  });

  it("writes a template mission the user can read", async () => {
    const outcome = await generateMission({ userId, date: today, store: store(), generator: createTemplateGenerator() });
    expect(outcome).toMatchObject({ status: "ready", source: "template" });

    const mission = missionSchema.parse(await repo.getMission(today));
    expect(mission.exerciseSource).toBe("template");
    expect(mission.budgetMinutes).toBe(30);
    expect(mission.sessions.map((s) => s.language)).toEqual(["ru", "it"]);
    const shares = splitBudget(30, PREFERENCES.goals).map((s) => s.minutes);
    mission.sessions.forEach((session, i) => {
      expect(titles.has(session.content.title)).toBe(true);
      // Never more than the language's share (less when the template's exercises reach their caps).
      expect(session.activities.reduce((sum, a) => sum + a.estimatedMinutes, 0)).toBeLessThanOrEqual(shares[i]);
    });
  });

  it("is idempotent: asking again does not write a second mission", async () => {
    const outcome = await generateMission({ userId, date: today, store: store(), generator: createTemplateGenerator() });
    expect(outcome).toMatchObject({ status: "ready", source: null });
    const { count } = await admin.from("missions").select("id", { count: "exact", head: true }).eq("user_id", userId);
    expect(count).toBe(1);
  });

  it("sees the contents already used", async () => {
    const used = await store().listUsedContentIds(userId, today);
    expect(used).toHaveLength(2);
    expect(used.every((id) => contentIds.includes(id))).toBe(true);
    expect(await store().listUsedContentIds(userId, tomorrow)).toEqual([]);
  });

  it("writes gradeable AI questions, on contents not used the day before", async () => {
    const usedToday = await store().listUsedContentIds(userId, today);
    const outcome = await generateMission({ userId, date: tomorrow, store: store(), generator: fakeAi });
    expect(outcome).toMatchObject({ status: "ready", source: "ai" });

    const mission = missionSchema.parse(await repo.getMission(tomorrow));
    expect(mission.exerciseSource).toBe("ai");
    expect(await store().listUsedContentIds(userId, today)).toHaveLength(usedToday.length + 2);

    const session = mission.sessions[0];
    const question = session.questions[0];
    await repo.answerQuestion(session.id, question.id, question.answerIndex);
    const { data, error } = await client.from("quiz_answers").select("is_correct").eq("session_id", session.id);
    expect(error).toBeNull();
    expect(data).toEqual([{ is_correct: true }]);
  });

  it("filters candidates by type and by licence policy", async () => {
    const articles = await store().listCandidates("ru", { contentTypes: ["article"], limit: 50 });
    expect(mine(articles)).toHaveLength(3);
    expect(articles[0].publishedAt).not.toBeNull();
    expect(mine(await store().listCandidates("ru", { contentTypes: ["podcast"], limit: 50 }))).toEqual([]);

    // The test sources do not allow commercial use.
    const commercial = createSupabaseMissionStore(admin, { policy: "commercial" });
    expect(mine(await commercial.listCandidates("ru", { limit: 50 }))).toEqual([]);
  });
});

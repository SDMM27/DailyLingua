import { describe, expect, it } from "vitest";
import { isSourceReadable } from "@/lib/content/policy";
import type { SourceAccess } from "@/lib/schemas/content";
import type { Language } from "@/lib/schemas/common";
import type { CandidateContent, ExerciseGenerator, GenerationMeta, GenerationRequest } from "@/lib/schemas/generation";
import type { Preferences } from "@/lib/schemas/preferences";
import { SessionNotFoundError, SessionReplacementInProgressError, SessionReplacementLimitError } from "./errors";
import type { PlannedSession } from "./generate-mission";
import {
  MAX_SESSION_REPLACEMENTS_PER_DAY,
  replaceMissionSession,
  type ReplaceableSession,
  type SessionReplacementStore,
} from "./replace-session";

const NOW = new Date("2026-10-13T12:00:00Z");

const preferences: Preferences = {
  goals: [
    { language: "it", level: "B1", targetLevel: "B2", focus: "", purpose: "general", weight: 1, topics: ["société"], contentTypes: ["article"] },
    { language: "es", level: "A2", targetLevel: "B1", focus: "oral", purpose: "conversational", weight: 1, topics: ["société"], contentTypes: ["article"] },
  ],
  dailyMinutes: 20,
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: "Europe/Paris",
  showStreak: true,
};

const content = (language: Language, n: number): CandidateContent => ({
  id: `${language}-${n}`,
  type: "article",
  title: `Titre ${language} ${n}`,
  summary: "Résumé",
  sourceName: "Source",
  difficulty: "B1",
  durationMinutes: 4,
  categories: [],
  publishedAt: "2026-10-13T08:00:00Z",
});

const OLD: ReplaceableSession = {
  missionId: "m1",
  missionDate: "2026-10-13",
  language: "it",
  position: 0,
  minutes: 10,
};

function memoryStore(
  options: {
    session?: ReplaceableSession | null;
    prefs?: Preferences | null;
    pool?: CandidateContent[];
    used?: string[];
    refused?: string[];
    replaceError?: Error;
    /** Access level of the source of a content, by content id (default: free). The source id is `src-<content id>`. */
    sourceAccess?: Record<string, SourceAccess>;
    /** Paid sources the user declared (source ids). */
    declared?: string[];
    /** Replacements already reserved on the mission. */
    reserved?: number;
    releaseError?: Error;
  } = {},
) {
  const calls = {
    replaced: [] as { sessionId: string; userId: string; session: PlannedSession; meta: GenerationMeta }[],
    usedSince: [] as string[],
    reserved: options.reserved ?? 0,
    released: 0,
  };
  // Like the database function: synchronous check-and-set, so concurrent callers are serialised.
  let replacing = false;
  const pool = options.pool ?? [content("it", 1), content("it", 2), content("it", 3)];
  const store: SessionReplacementStore = {
    async getSessionForReplacement() {
      return options.session === undefined ? OLD : options.session;
    },
    async getPreferences() {
      return options.prefs === undefined ? preferences : options.prefs;
    },
    async listCandidates(language, { declaredSourceIds }) {
      return language === "it"
        ? pool.filter((c) =>
            isSourceReadable({ id: `src-${c.id}`, access: options.sourceAccess?.[c.id] ?? "free" }, declaredSourceIds),
          )
        : [];
    },
    async listDeclaredSourceIds() {
      return options.declared ?? [];
    },
    async listUsedContentIds(_userId, since) {
      calls.usedSince.push(since);
      return options.used ?? [];
    },
    async listRefusedContentIds() {
      return options.refused ?? [];
    },
    async reserveReplacement() {
      if (replacing) throw new SessionReplacementInProgressError();
      if (calls.reserved >= MAX_SESSION_REPLACEMENTS_PER_DAY) throw new SessionReplacementLimitError();
      replacing = true;
      calls.reserved += 1;
    },
    async releaseReplacement() {
      calls.released += 1;
      replacing = false;
      if (options.releaseError) throw options.releaseError;
    },
    async replaceSession(sessionId, userId, session, meta) {
      if (options.replaceError) throw options.replaceError;
      replacing = false;
      calls.replaced.push({ sessionId, userId, session, meta });
    },
  };
  return { store, calls };
}

function aiGenerator(): ExerciseGenerator & { requests: GenerationRequest[] } {
  const requests: GenerationRequest[] = [];
  return {
    name: "claude",
    requests,
    async generate(request) {
      requests.push(request);
      return {
        source: "ai",
        model: "claude-test",
        promptVersion: "v1",
        usage: { inputTokens: 100, outputTokens: 50 },
        sessions: request.sessions.map((s) => ({
          language: s.language,
          candidateIndex: 0,
          questions: [{ prompt: "Domanda?", options: ["a", "b", "c"], answerIndex: 0, explanation_fr: "Perché." }],
          expressions: ["uno", "due", "tre"].map((text) => ({ text, translation_fr: "t", example: "e", note_fr: "" })),
          production: { prompt: "Scrivi.", hints_fr: ["x", "y"] },
        })),
      };
    },
  };
}

const throwing = (error: unknown): ExerciseGenerator => ({
  name: "claude",
  async generate() {
    throw error;
  },
});

const run = (store: SessionReplacementStore, generator: ExerciseGenerator) =>
  replaceMissionSession({ userId: "u1", sessionId: "s1", store, generator, now: () => NOW });

const total = (session: PlannedSession) => session.activities.reduce((sum, a) => sum + a.estimatedMinutes, 0);

describe("replaceMissionSession", () => {
  it("replaces the session with another content of the same language and the same minutes", async () => {
    const { store, calls } = memoryStore({ used: ["it-1"] });
    const generator = aiGenerator();
    expect(await run(store, generator)).toEqual({ status: "ready" });

    expect(generator.requests).toHaveLength(1);
    expect(generator.requests[0].sessions).toHaveLength(1);
    expect(generator.requests[0].sessions[0]).toMatchObject({ language: "it", minutes: 10 });
    expect(calls.replaced).toHaveLength(1);
    const { sessionId, userId, session, meta } = calls.replaced[0];
    expect([sessionId, userId]).toEqual(["s1", "u1"]);
    expect(session.language).toBe("it");
    expect(session.contentId).not.toBe("it-1");
    expect(total(session)).toBe(10);
    expect(meta).toMatchObject({ source: "ai", model: "claude-test", fallbackReason: null });
  });

  it("excludes the contents used in the last 30 days and the refused ones", async () => {
    const { store, calls } = memoryStore({ used: ["it-1"], refused: ["it-2"] });
    const generator = aiGenerator();
    await run(store, generator);
    expect(generator.requests[0].sessions[0].candidates.map((c) => c.id)).toEqual(["it-3"]);
    expect(calls.replaced[0].session.contentId).toBe("it-3");
    expect(calls.usedSince).toEqual(["2026-09-13"]);
  });

  it("stops at the daily limit without calling the generator", async () => {
    const { store, calls } = memoryStore({ reserved: MAX_SESSION_REPLACEMENTS_PER_DAY });
    const generator = aiGenerator();
    expect(await run(store, generator)).toEqual({ status: "limit" });
    expect(generator.requests).toHaveLength(0);
    expect(calls.replaced).toHaveLength(0);
    expect(calls.released).toBe(0);
  });

  it("lets only one of two concurrent replacements of the same session reach the generator", async () => {
    const { store, calls } = memoryStore();
    const generator = aiGenerator();
    const outcomes = await Promise.all([run(store, generator), run(store, generator)]);
    expect(outcomes).toContainEqual({ status: "ready" });
    expect(outcomes).toContainEqual({ status: "in-progress" });
    expect(generator.requests).toHaveLength(1);
    expect(calls.replaced).toHaveLength(1);
    expect(calls.reserved).toBe(1);
  });

  it("releases the session when the replacement fails, so that a retry succeeds (the slot stays consumed)", async () => {
    const failing = memoryStore({ replaceError: new Error("db down") });
    expect(await run(failing.store, aiGenerator())).toEqual({ status: "failed", reason: "db down" });
    expect(failing.calls.released).toBe(1);

    // The first attempt fails (database error), the retry goes through.
    let failOnce = true;
    const { store, calls } = memoryStore();
    const flaky: SessionReplacementStore = {
      ...store,
      async replaceSession(...args) {
        if (failOnce) {
          failOnce = false;
          throw new Error("db down");
        }
        return store.replaceSession(...args);
      },
    };
    expect(await run(flaky, aiGenerator())).toMatchObject({ status: "failed" });
    expect(calls.released).toBe(1);
    expect(await run(flaky, aiGenerator())).toEqual({ status: "ready" });
    expect(calls.reserved).toBe(2);
    expect(calls.replaced).toHaveLength(1);
  });

  it("logs a failed release without changing the outcome", async () => {
    const { store } = memoryStore({ used: ["it-1", "it-2"], refused: ["it-3"], releaseError: new Error("rpc down") });
    const messages: string[] = [];
    const outcome = await replaceMissionSession({
      userId: "u1",
      sessionId: "s1",
      store,
      generator: aiGenerator(),
      now: () => NOW,
      log: (m) => messages.push(m),
    });
    expect(outcome).toEqual({ status: "no-content" });
    expect(messages.join(" ")).toContain("could not release");
  });

  it("maps a session gone in the meantime to not-found", async () => {
    const { store } = memoryStore({ replaceError: new SessionNotFoundError() });
    expect(await run(store, aiGenerator())).toEqual({ status: "not-found" });
  });

  it("reports an unknown session, or a language no longer studied, as not-found", async () => {
    const generator = aiGenerator();
    expect(await run(memoryStore({ session: null }).store, generator)).toEqual({ status: "not-found" });
    const noItalian = { ...preferences, goals: preferences.goals.filter((g) => g.language !== "it") };
    expect(await run(memoryStore({ prefs: noItalian }).store, generator)).toEqual({ status: "not-found" });
    expect(await run(memoryStore({ prefs: null }).store, generator)).toEqual({ status: "not-found" });
    expect(generator.requests).toHaveLength(0);
  });

  it("reports no-content when nothing readable is left", async () => {
    const { store, calls } = memoryStore({ used: ["it-1", "it-2"], refused: ["it-3"] });
    const generator = aiGenerator();
    expect(await run(store, generator)).toEqual({ status: "no-content" });
    expect(generator.requests).toHaveLength(0);
    expect(calls.replaced).toHaveLength(0);
    expect(calls.released).toBe(1);
  });

  it("only replaces with a paid content whose source the user declared", async () => {
    const pool = [content("it", 1)];
    const metered = { "it-1": "metered" as const };
    const none = memoryStore({ pool, sourceAccess: metered });
    expect(await run(none.store, aiGenerator())).toEqual({ status: "no-content" });

    const declared = memoryStore({ pool, sourceAccess: metered, declared: ["src-it-1"] });
    expect(await run(declared.store, aiGenerator())).toEqual({ status: "ready" });
    expect(declared.calls.replaced[0].session.contentId).toBe("it-1");
  });

  it("falls back to the template when the generator fails", async () => {
    const { store, calls } = memoryStore();
    const messages: string[] = [];
    const outcome = await replaceMissionSession({
      userId: "u1",
      sessionId: "s1",
      store,
      generator: throwing(new Error("boom")),
      now: () => NOW,
      log: (m) => messages.push(m),
    });
    expect(outcome).toEqual({ status: "ready" });
    expect(calls.replaced[0].meta.source).toBe("template");
    expect(calls.replaced[0].meta.fallbackReason).toContain("boom");
    expect(messages[0]).toContain("claude failed");
  });

  it("reports a failure without throwing", async () => {
    const { store } = memoryStore({ replaceError: new Error("db down") });
    expect(await run(store, aiGenerator())).toEqual({ status: "failed", reason: "db down" });
  });
});

import { describe, expect, it } from "vitest";
import type { ContentType, Language } from "@/lib/schemas/common";
import type {
  CandidateContent,
  ExerciseGenerator,
  GenerationMeta,
  GenerationRequest,
} from "@/lib/schemas/generation";
import type { Preferences } from "@/lib/schemas/preferences";
import { GenerationError } from "./errors";
import { productionTargetLength } from "./plan-activities";
import { generateMission, type MissionStore, type PlannedSession } from "./generate-mission";
import { createTemplateGenerator } from "./template-generator";

const NOW = new Date("2026-10-13T12:00:00Z");

const preferences: Preferences = {
  goals: [
    { language: "it", level: "B1", targetLevel: "B2", focus: "", purpose: "general", weight: 1 },
    { language: "es", level: "A2", targetLevel: "B1", focus: "oral", purpose: "conversational", weight: 1 },
  ],
  dailyMinutes: 20,
  topics: ["société"],
  contentTypes: ["article"],
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: "Europe/Paris",
};

function content(language: Language, n: number, overrides: Partial<CandidateContent> = {}): CandidateContent {
  return {
    id: `${language}-${n}`,
    type: "article",
    title: `Titre ${language} ${n}`,
    summary: "Résumé",
    sourceName: "Source",
    difficulty: "B1",
    durationMinutes: 4,
    categories: [],
    publishedAt: "2026-10-13T08:00:00Z",
    ...overrides,
  };
}

interface Calls {
  completed: { missionId: string; sessions: PlannedSession[]; meta: GenerationMeta }[];
  failed: { missionId: string; error: string }[];
  candidateQueries: { language: Language; contentTypes?: ContentType[] }[];
  usedSince: string[];
}

function memoryStore(
  options: {
    prefs?: Preferences | null;
    pools?: Partial<Record<Language, CandidateContent[]>>;
    used?: string[];
    claim?: { status: "generating" | "ready" | "failed"; claimed: boolean };
    completeError?: Error;
  } = {},
) {
  const calls: Calls = { completed: [], failed: [], candidateQueries: [], usedSince: [] };
  const pools = options.pools ?? { it: [content("it", 1), content("it", 2)], es: [content("es", 1)] };
  const store: MissionStore = {
    async getPreferences() {
      return options.prefs === undefined ? preferences : options.prefs;
    },
    async listCandidates(language, { contentTypes }) {
      calls.candidateQueries.push({ language, contentTypes });
      return pools[language] ?? [];
    },
    async listUsedContentIds(_userId, since) {
      calls.usedSince.push(since);
      return options.used ?? [];
    },
    async claim() {
      return { missionId: "m1", ...(options.claim ?? { status: "generating", claimed: true }) };
    },
    async complete(missionId, sessions, meta) {
      if (options.completeError) throw options.completeError;
      calls.completed.push({ missionId, sessions, meta });
    },
    async fail(missionId, error) {
      calls.failed.push({ missionId, error });
    },
  };
  return { store, calls };
}

/** A well-behaved model: first candidate, one question, three expressions. */
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

const run = (store: MissionStore, generator: ExerciseGenerator, extra: { fallback?: ExerciseGenerator } = {}) =>
  generateMission({ userId: "u1", date: "2026-10-13", store, generator, now: () => NOW, ...extra });

const total = (session: PlannedSession) => session.activities.reduce((sum, a) => sum + a.estimatedMinutes, 0);

describe("generateMission", () => {
  it("writes the sessions in preference order, filling each share", async () => {
    const { store, calls } = memoryStore();
    const generator = aiGenerator();
    expect(await run(store, generator)).toEqual({ status: "ready", missionId: "m1", source: "ai" });

    const [done] = calls.completed;
    expect(done.sessions.map((s) => s.language)).toEqual(["it", "es"]);
    expect(done.sessions.map(total)).toEqual([10, 10]);
    expect(done.sessions[0].questions[0].id).toBe("it-q1");
    expect(done.sessions[0].activities.map((a) => a.kind)).toEqual(["reading", "comprehension", "vocabulary", expect.stringMatching(/writing|speaking/)]);
    expect(done.meta).toMatchObject({
      source: "ai",
      model: "claude-test",
      promptVersion: "v1",
      inputTokens: 100,
      outputTokens: 50,
      fallbackReason: null,
    });
    expect(generator.requests[0].topics).toEqual(["société"]);
    expect(generator.requests[0].sessions.map((s) => s.productionMode)).not.toContain(undefined);
    expect(calls.failed).toEqual([]);
    expect(calls.usedSince).toEqual(["2026-09-13"]);
  });

  it("passes each goal's purpose to the generator", async () => {
    const { store } = memoryStore();
    const generator = aiGenerator();
    await run(store, generator);
    expect(generator.requests[0].sessions.map((s) => [s.language, s.purpose])).toEqual([
      ["it", "general"],
      ["es", "conversational"],
    ]);
  });

  it("tells the model the production time and sizes the task from the final plan", async () => {
    const { store, calls } = memoryStore();
    const generator = aiGenerator();
    await run(store, generator);
    for (const [i, request] of generator.requests[0].sessions.entries()) {
      const session = calls.completed[0].sessions[i];
      const production = session.activities.at(-1)!;
      expect(request.productionMinutes).toBeGreaterThan(0);
      expect(request.productionMinutes).toBeLessThanOrEqual(request.minutes);
      expect(session.production.targetLength).toBe(
        productionTargetLength(session.production.mode, production.estimatedMinutes),
      );
    }
  });

  it("falls back to the template when the generator throws", async () => {
    const { store, calls } = memoryStore();
    const logs: string[] = [];
    const outcome = await generateMission({
      userId: "u1",
      date: "2026-10-13",
      store,
      generator: throwing(new GenerationError("timeout", "Claude : délai dépassé")),
      now: () => NOW,
      log: (m) => logs.push(m),
    });
    expect(outcome).toEqual({ status: "ready", missionId: "m1", source: "template" });
    const { meta, sessions } = calls.completed[0];
    expect(meta).toMatchObject({ source: "template", model: "template", promptVersion: null, inputTokens: null });
    expect(meta.fallbackReason).toBe("timeout: Claude : délai dépassé");
    expect(sessions.map(total)).toEqual([10, 10]);
    expect(sessions[0].activities.map((a) => a.kind)).toEqual(["reading", expect.stringMatching(/writing|speaking/)]);
    expect(logs.length).toBeGreaterThan(0);
  });

  it("falls back when the output is unusable", async () => {
    const { store, calls } = memoryStore();
    const bad: ExerciseGenerator = {
      name: "claude",
      async generate(request) {
        const result = await aiGenerator().generate(request);
        return { ...result, sessions: result.sessions.map((s) => ({ ...s, expressions: [] })) };
      },
    };
    expect(await run(store, bad)).toMatchObject({ status: "ready", source: "template" });
    expect(calls.completed[0].meta.fallbackReason).toMatch(/^invalid_output:/);
  });

  it("truncates a long fallback reason and handles plain errors", async () => {
    const { store, calls } = memoryStore();
    await run(store, throwing(new Error("x".repeat(500))));
    expect(calls.completed[0].meta.fallbackReason).toHaveLength(300);
    expect(calls.completed[0].meta.fallbackReason?.startsWith("error: ")).toBe(true);
  });

  it("does not retry when the generator is already the template", async () => {
    const { store, calls } = memoryStore();
    const template = createTemplateGenerator();
    const broken: ExerciseGenerator = { name: "template", generate: () => Promise.reject(new Error("nope")) };
    expect(await run(store, broken, { fallback: template })).toMatchObject({ status: "failed", missionId: "m1" });
    expect(calls.failed).toHaveLength(1);
    expect(calls.completed).toEqual([]);
  });

  it("reports missions it did not claim", async () => {
    const generator = aiGenerator();
    for (const [claim, expected] of [
      [{ status: "ready", claimed: false }, { status: "ready", missionId: "m1", source: null }],
      [{ status: "generating", claimed: false }, { status: "pending", missionId: "m1" }],
      [{ status: "failed", claimed: false }, { status: "failed", missionId: "m1", reason: "attempts_exhausted" }],
    ] as const) {
      const { store, calls } = memoryStore({ claim });
      expect(await run(store, generator)).toEqual(expected);
      expect(calls.completed).toEqual([]);
      expect(calls.candidateQueries).toEqual([]);
    }
    expect(generator.requests).toEqual([]);
  });

  it("needs preferences", async () => {
    const { store } = memoryStore({ prefs: null });
    expect(await run(store, aiGenerator())).toEqual({ status: "no-preferences" });
  });

  it("gives the whole budget to the languages that have content", async () => {
    const { store, calls } = memoryStore({ pools: { it: [content("it", 1)] } });
    const generator = aiGenerator();
    await run(store, generator);
    const { sessions } = calls.completed[0];
    expect(sessions.map((s) => s.language)).toEqual(["it"]);
    // The whole share is offered; the plan may use less when every exercise reached its cap.
    expect(generator.requests[0].sessions[0].minutes).toBe(20);
    expect(total(sessions[0])).toBeLessThanOrEqual(20);
  });

  it("retries without the content types when none match", async () => {
    const { store, calls } = memoryStore();
    await run(store, aiGenerator());
    expect(calls.candidateQueries.filter((q) => q.language === "it")).toEqual([
      { language: "it", contentTypes: ["article"] },
    ]);

    const empty = memoryStore({ pools: {} });
    await run(empty.store, aiGenerator());
    expect(empty.calls.candidateQueries.slice(0, 2)).toEqual([
      { language: "it", contentTypes: ["article"] },
      { language: "it", contentTypes: undefined },
    ]);
  });

  it("fails cleanly when there is no content at all", async () => {
    const { store, calls } = memoryStore({ pools: {} });
    expect(await run(store, aiGenerator())).toEqual({ status: "no-content" });
    expect(calls.failed).toEqual([{ missionId: "m1", error: "no content" }]);
  });

  it("excludes contents already used", async () => {
    const { store, calls } = memoryStore({ used: ["it-1"] });
    const generator = aiGenerator();
    await run(store, generator);
    expect(generator.requests[0].sessions[0].candidates.map((c) => c.id)).toEqual(["it-2"]);
    expect(calls.completed[0].sessions[0].contentId).toBe("it-2");

    const allUsed = memoryStore({ used: ["it-1", "it-2", "es-1"] });
    expect(await run(allUsed.store, aiGenerator())).toEqual({ status: "no-content" });
  });

  it("marks the mission failed when saving throws", async () => {
    const { store, calls } = memoryStore({ completeError: new Error("db down") });
    const outcome = await run(store, aiGenerator());
    expect(outcome).toMatchObject({ status: "failed", missionId: "m1" });
    expect(calls.failed).toEqual([{ missionId: "m1", error: "error: db down" }]);
  });

  it("never leaves the mission generating on unexpected errors", async () => {
    const { store, calls } = memoryStore();
    store.listCandidates = async () => {
      throw new Error("boom");
    };
    expect(await run(store, aiGenerator())).toMatchObject({ status: "failed" });
    expect(calls.failed).toHaveLength(1);
  });
});

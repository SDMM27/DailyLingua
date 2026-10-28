import { describe, expect, it } from "vitest";
import type { ContentType, Language } from "@/lib/schemas/common";
import type {
  CandidateContent,
  ExerciseGenerator,
  GenerationMeta,
  GenerationRequest,
} from "@/lib/schemas/generation";
import { isSourceReadable } from "@/lib/content/policy";
import type { SourceAccess } from "@/lib/schemas/content";
import type { Preferences } from "@/lib/schemas/preferences";
import { GenerationError } from "./errors";
import { productionTargetLength } from "./plan-activities";
import { buildRanks } from "@/lib/domain/frequency";
import { buildUserMessage } from "./prompt";
import { buildSessionRequest, generateMission, planSession, type MissionStore, type PlannedSession } from "./generate-mission";
import { createTemplateGenerator } from "./template-generator";

const NOW = new Date("2026-10-13T12:00:00Z");

const preferences: Preferences = {
  goals: [
    { language: "it", level: "B1", targetLevel: "B2", focus: "", purpose: "general", weight: 10, days: [1, 2, 3, 4, 5, 6, 7], topics: ["société"], contentTypes: ["article"] },
    { language: "es", level: "A2", targetLevel: "B1", focus: "oral", purpose: "conversational", weight: 10, days: [1, 2, 3, 4, 5, 6, 7], topics: ["société"], contentTypes: ["article"] },
  ],
  dailyMinutes: 20,
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: "Europe/Paris",
  showStreak: true,
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
  /** Budget (minutes) of each `claim`. */
  claims: number[];
}

function memoryStore(
  options: {
    prefs?: Preferences | null;
    pools?: Partial<Record<Language, CandidateContent[]>>;
    used?: string[];
    refused?: string[];
    claim?: { status: "generating" | "ready" | "failed"; claimed: boolean };
    completeError?: Error;
    /** Access level of the source of a content, by content id (default: free). The source id is `src-<content id>`. */
    sourceAccess?: Record<string, SourceAccess>;
    /** Paid sources the user declared (source ids). */
    declared?: string[];
  } = {},
) {
  const calls: Calls = { completed: [], failed: [], candidateQueries: [], usedSince: [], claims: [] };
  const pools = options.pools ?? { it: [content("it", 1), content("it", 2)], es: [content("es", 1)] };
  const store: MissionStore = {
    async getPreferences() {
      return options.prefs === undefined ? preferences : options.prefs;
    },
    async listCandidates(language, { contentTypes, declaredSourceIds }) {
      calls.candidateQueries.push({ language, contentTypes });
      return (pools[language] ?? []).filter((c) =>
        isSourceReadable({ id: `src-${c.id}`, access: options.sourceAccess?.[c.id] ?? "free" }, declaredSourceIds),
      );
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
    async claim(_userId, _date, budgetMinutes) {
      calls.claims.push(budgetMinutes);
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

const run = (
  store: MissionStore,
  generator: ExerciseGenerator,
  extra: { fallback?: ExerciseGenerator } = {},
) =>
  generateMission({ userId: "u1", date: "2026-10-13", store, generator, now: () => NOW, ...extra });

const total = (session: PlannedSession) => session.activities.reduce((sum, a) => sum + a.estimatedMinutes, 0);

describe("generateMission", () => {
  describe("source access", () => {
    const pools = { it: [content("it", 1), content("it", 2)], es: [content("es", 1)] };

    it("never selects a content from a source the user cannot read", async () => {
      const { store, calls } = memoryStore({ pools, sourceAccess: { "it-1": "metered", "it-2": "paywalled" } });
      const generator = aiGenerator();
      // Italian has nothing readable left: only Spanish is proposed.
      expect(await run(store, generator)).toMatchObject({ status: "ready" });
      expect(calls.completed[0].sessions.map((s) => s.language)).toEqual(["es"]);
    });

    it("selects a paid content once the user declared its source", async () => {
      const { store, calls } = memoryStore({
        pools,
        sourceAccess: { "it-1": "metered", "it-2": "paywalled" },
        declared: ["src-it-1", "src-it-2"],
      });
      await run(store, aiGenerator());
      expect(calls.completed[0].sessions.map((s) => s.language)).toEqual(["it", "es"]);
    });

    it("declaring one source does not open the others", async () => {
      const { store, calls } = memoryStore({
        pools,
        sourceAccess: { "it-1": "metered", "it-2": "metered" },
        declared: ["src-it-1"],
      });
      await run(store, aiGenerator());
      expect(calls.completed[0].sessions.map((s) => s.language)).toEqual(["it", "es"]);
      expect(calls.completed[0].sessions[0].contentId).toBe("it-1");
    });

    it("yields no-content when the only content is metered", async () => {
      const { store, calls } = memoryStore({ pools: { it: [content("it", 1)] }, sourceAccess: { "it-1": "metered" } });
      expect(await run(store, aiGenerator())).toEqual({ status: "no-content" });
      expect(calls.failed).toHaveLength(1);
    });
  });

  it("writes the sessions in preference order, filling each share", async () => {
    const { store, calls } = memoryStore();
    const generator = aiGenerator();
    expect(await run(store, generator)).toEqual({ status: "ready", missionId: "m1", source: "ai" });

    const [done] = calls.completed;
    expect(done.sessions.map((s) => s.language)).toEqual(["it", "es"]);
    expect(done.sessions.map(total)).toEqual([10, 10]);
    expect(done.sessions[0].questions[0].id).toBe("it-q1");
    expect(done.sessions[0].activities.map((a) => a.kind)).toEqual(["reading", "comprehension", "vocabulary", "writing"]);
    expect(done.meta).toMatchObject({
      source: "ai",
      model: "claude-test",
      promptVersion: "v1",
      inputTokens: 100,
      outputTokens: 50,
      fallbackReason: null,
    });
    expect(generator.requests[0].sessions.map((s) => s.topics)).toEqual([["société"], ["société"]]);
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

  it("gives each language its own topics and content types", async () => {
    const prefs: Preferences = {
      ...preferences,
      goals: [
        { ...preferences.goals[0], topics: ["économie"], contentTypes: ["article"] },
        { ...preferences.goals[1], topics: ["cinéma", "gastronomie"], contentTypes: ["podcast"] },
      ],
    };
    const pools = {
      it: [content("it", 1)],
      es: [content("es", 1, { type: "podcast" })],
    };
    const { store, calls } = memoryStore({ prefs, pools });
    const generator = aiGenerator();
    await run(store, generator);
    expect(generator.requests[0].sessions.map((s) => [s.language, s.topics])).toEqual([
      ["it", ["économie"]],
      ["es", ["cinéma", "gastronomie"]],
    ]);
    expect(calls.candidateQueries).toEqual([
      { language: "it", contentTypes: ["article"] },
      { language: "es", contentTypes: ["podcast"] },
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
        productionTargetLength(session.production.mode as "writing" | "spoken", production.estimatedMinutes),
      );
    }
  });

  it("plans a spoken session: a writing activity of up to 10 minutes, sized from the mode", () => {
    const planned = planSession(
      {
        language: "it",
        content: content("it", 1),
        questions: [],
        expressions: [],
        production: { mode: "spoken", prompt: "Scrivi.", hints: [] },
      },
      40,
    );
    expect(planned.activities.at(-1)).toMatchObject({ kind: "writing", title: "Écrire puis dire à voix haute", estimatedMinutes: 10 });
    expect(planned.production).toMatchObject({ mode: "spoken", targetLength: productionTargetLength("spoken", 10) });
    expect(planned.production.targetLength).toBe("40–60 mots");
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
    expect(sessions[0].activities.map((a) => a.kind)).toEqual(["reading", "writing"]);
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

  describe("weekdays", () => {
    // 2026-10-13 is a Tuesday. Italian: Monday and Tuesday (10 min); Spanish: Wednesday only (15 min).
    const week: Preferences = {
      ...preferences,
      goals: [
        { ...preferences.goals[0], days: [1, 2], weight: 10 },
        { ...preferences.goals[1], days: [3], weight: 15 },
      ],
    };

    it("makes no mission on a rest day: no claim, no model call", async () => {
      const { store, calls } = memoryStore({ prefs: { ...week, goals: [{ ...week.goals[0], days: [1, 5] }, { ...week.goals[1], days: [3] }] } });
      const generator = aiGenerator();
      expect(await run(store, generator)).toEqual({ status: "rest-day" });
      expect(calls.claims).toEqual([]);
      expect(calls.candidateQueries).toEqual([]);
      expect(calls.completed).toEqual([]);
      expect(generator.requests).toEqual([]);
    });

    it("only plans the languages of the day, with their minutes as the budget", async () => {
      const { store, calls } = memoryStore({ prefs: week });
      const generator = aiGenerator();
      expect(await run(store, generator)).toMatchObject({ status: "ready" });
      expect(calls.claims).toEqual([10]);
      expect(calls.candidateQueries.map((q) => q.language)).not.toContain("es");
      expect(calls.completed[0].sessions.map((s) => s.language)).toEqual(["it"]);
      expect(generator.requests[0].sessions).toHaveLength(1);
      expect(generator.requests[0].sessions[0].minutes).toBe(10);
    });

    it("sums the minutes of the languages of the day", async () => {
      const { store, calls } = memoryStore({ prefs: { ...week, goals: [{ ...week.goals[0], weight: 25 }, { ...week.goals[1], days: [2], weight: 15 }] } });
      const generator = aiGenerator();
      await run(store, generator);
      expect(calls.claims).toEqual([40]);
      expect(generator.requests[0].sessions.map((s) => s.minutes)).toEqual([25, 15]);
    });

    it("keeps a language's production mode tied to its position in the whole list", async () => {
      const everyDay = [1, 2, 3, 4, 5, 6, 7];
      const both = { ...preferences, goals: preferences.goals.map((g) => ({ ...g, days: everyDay })) };
      const first = aiGenerator();
      await run(memoryStore({ prefs: both }).store, first);
      // Spanish alone that day (Italian rests): it keeps position 1, hence the other mode than Italian had.
      const alone = { ...both, goals: [{ ...both.goals[0], days: [1] }, both.goals[1]] };
      const second = aiGenerator();
      await run(memoryStore({ prefs: alone }).store, second);
      expect(second.requests[0].sessions[0].language).toBe("es");
      expect(second.requests[0].sessions[0].productionMode).toBe(first.requests[0].sessions[1].productionMode);
    });
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

  it("never proposes a content the user declared unreadable", async () => {
    const { store, calls } = memoryStore({ refused: ["it-1"] });
    const generator = aiGenerator();
    await run(store, generator);
    expect(generator.requests[0].sessions[0].candidates.map((c) => c.id)).toEqual(["it-2"]);
    expect(calls.completed[0].sessions[0].contentId).toBe("it-2");

    const allRefused = memoryStore({ refused: ["it-1", "it-2", "es-1"] });
    expect(await run(allRefused.store, aiGenerator())).toEqual({ status: "no-content" });
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

describe("vocabulary frequency", () => {
  const frequency = buildRanks("es", ["el", "la", "de", "y", "casa", "grande", "es", "una", "en", "pan"]);
  const teaser = "Una casa grande en la ciudad y el pan de la casa es muy bueno";

  const sessionFor = (level: "A1" | "A2" | "B1" | "B2") =>
    buildSessionRequest({
      goal: { ...preferences.goals[1], level },
      preferences,
      declaredSourceIds: [],
      minutes: 10,
      excludeIds: new Set(),
      now: NOW,
      frequency,
      pool: [content("es", 1, { summary: teaser })],
      productionMode: "writing",
    });

  it("gives the frequent words of the teaser to the model at A1 and A2 only", () => {
    for (const level of ["A1", "A2"] as const) {
      const session = sessionFor(level);
      expect(session.candidates[0].frequentWords).toEqual(["una", "casa", "grande", "en", "la", "y", "el", "pan", "de", "es"]);
      expect(buildUserMessage({ date: "2026-10-13", sessions: [session] })).toContain("frequent words of the teaser: una, casa, grande");
    }
    for (const level of ["B1", "B2"] as const) {
      expect(sessionFor(level).candidates[0].frequentWords).toBeUndefined();
      expect(buildUserMessage({ date: "2026-10-13", sessions: [sessionFor(level)] })).not.toContain("frequent words");
    }
  });

  it("records the coverage of the chosen content in the trace", async () => {
    const { store, calls } = memoryStore({ pools: { it: [content("it", 1)], es: [content("es", 1, { summary: teaser })] } });
    const lists = { it: buildRanks("it", ["il", "la"]), es: frequency };
    await generateMission({
      userId: "u1",
      date: "2026-10-13",
      store,
      generator: aiGenerator(),
      now: () => NOW,
      loadFrequency: async (language) => lists[language as "it" | "es"],
    });
    const { coverage } = calls.completed[0].meta;
    // Italian: "Titre it 1. Résumé" is under 8 words, so not measurable. Spanish: 17 words counted.
    expect(coverage).toEqual([
      { language: "it", contentId: "it-1", top1000: null, top2000: null },
      { language: "es", contentId: "es-1", top1000: expect.any(Number), top2000: expect.any(Number) },
    ]);
    expect(coverage![1].top1000).toBeGreaterThan(0.4);
  });

  it("still writes the mission when a frequency list cannot be read", async () => {
    const { store, calls } = memoryStore();
    const logs: string[] = [];
    const outcome = await generateMission({
      userId: "u1",
      date: "2026-10-13",
      store,
      generator: aiGenerator(),
      now: () => NOW,
      log: (m) => logs.push(m),
      loadFrequency: async () => {
        throw new Error("missing");
      },
    });
    expect(outcome).toMatchObject({ status: "ready" });
    expect(calls.completed[0].meta.coverage).toEqual([]);
    expect(logs.some((m) => m.includes("no frequency list"))).toBe(true);
  });
});

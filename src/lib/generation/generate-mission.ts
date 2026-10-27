import { addDays } from "@/lib/domain/dates";
import { coverageTarget, frequentWords, lexicalCoverage, type FrequencyRanks } from "@/lib/domain/frequency";
import { loadFrequencyRanks } from "@/lib/frequency";
import { splitBudget } from "@/lib/domain/time-budget";
import type { ContentType, DateKey, Language } from "@/lib/schemas/common";
import {
  GENERATION_LIMITS,
  generationMetaSchema,
  generationRequestSchema,
  plannedActivitySchema,
  type CandidateContent,
  type ExerciseGenerator,
  type GenerationMeta,
  type GenerationRequest,
  type GenerationResult,
  type PlannedActivity,
  type GeneratedProductionMode,
} from "@/lib/schemas/generation";
import type {
  ComprehensionQuestion,
  ExerciseSource,
  Expression,
  ProductionTask,
} from "@/lib/schemas/mission";
import type { Preferences } from "@/lib/schemas/preferences";
import { GenerationError } from "./errors";
import { chooseProductionMode, planActivities, productionActivityKind, productionTargetLength } from "./plan-activities";
import { rankCandidates } from "./select-contents";
import { createTemplateGenerator } from "./template-generator";
import { validateGeneratedMission, type ValidatedSession } from "./validate";

/** Contents already used in the last N days are not proposed again. */
const REUSE_WINDOW_DAYS = 30;
const CANDIDATE_POOL = 30;
const MAX_REASON_LENGTH = 300;
/** At A1–A2 the prompt lists the words of each teaser among this many most frequent forms, and at most this many. */
const FREQUENT_WORDS_TOP = 2000;
const MAX_FREQUENT_WORDS = 10;

/** Storage used by the orchestrator; implemented on Supabase by the app, in memory by the tests. */
export interface MissionStore {
  getPreferences(userId: string): Promise<Preferences | null>;
  /** Recent usable contents of a language (licence policy, active sources, not broken), newest first. `contentTypes` undefined = any type; `declaredSourceIds` = the paid sources the user declared they can read (free sources are always readable). */
  listCandidates(language: Language, options: { contentTypes?: ContentType[]; declaredSourceIds: readonly string[]; limit: number }): Promise<CandidateContent[]>;
  /** Paid sources this user declared they have access to (`user_source_access`). */
  listDeclaredSourceIds(userId: string): Promise<string[]>;
  /** Contents already used in this user's missions since `since` (inclusive). */
  listUsedContentIds(userId: string, since: DateKey): Promise<string[]>;
  /** Contents this user declared unreadable (« Je n’ai pas accès »): never proposed to them again. */
  listRefusedContentIds(userId: string): Promise<string[]>;
  claim(
    userId: string,
    date: DateKey,
    budgetMinutes: number,
  ): Promise<{ missionId: string; status: "generating" | "ready" | "failed"; claimed: boolean }>;
  complete(missionId: string, sessions: PlannedSession[], meta: GenerationMeta): Promise<void>;
  fail(missionId: string, error: string): Promise<void>;
}

export interface PlannedSession {
  language: Language;
  contentId: string;
  questions: ComprehensionQuestion[];
  expressions: Expression[];
  production: ProductionTask;
  activities: PlannedActivity[];
}

export type GenerateMissionOutcome =
  | { status: "ready"; missionId: string; source: ExerciseSource | null /* null when it was already ready */ }
  | { status: "pending"; missionId: string } // another request is generating it
  | { status: "failed"; missionId: string | null; reason: string }
  | { status: "no-preferences" }
  | { status: "no-content" };

export interface GenerateMissionInput {
  userId: string;
  date: DateKey;
  store: MissionStore;
  generator: ExerciseGenerator;
  /** Used when the generator fails or returns something unusable. Default: the template. */
  fallback?: ExerciseGenerator;
  now?: () => Date;
  log?: (message: string) => void;
  /** Word-frequency ranks of a language. Default: the lists of src/lib/frequency. */
  loadFrequency?: FrequencyLoader;
}

export type FrequencyLoader = (language: Language) => Promise<FrequencyRanks>;

/**
 * Ranks of each language, or none for a language whose list cannot be read: the vocabulary of the
 * contents is a refinement of the ranking and must never keep a mission from being written.
 */
export async function loadFrequencies(
  languages: Iterable<Language>,
  { load = loadFrequencyRanks, log = () => {} }: { load?: FrequencyLoader; log?: (message: string) => void } = {},
): Promise<Map<Language, FrequencyRanks>> {
  const ranks = new Map<Language, FrequencyRanks>();
  for (const language of new Set(languages)) {
    try {
      ranks.set(language, await load(language));
    } catch (error) {
      log(`generation: no frequency list for ${language}: ${describeError(error).message}`);
    }
  }
  return ranks;
}

interface PoolOptions {
  goal: Preferences["goals"][number];
  preferences: Preferences;
  declaredSourceIds: readonly string[];
  minutes: number;
  excludeIds: ReadonlySet<string>;
  now: Date;
  /** Word-frequency ranks of the goal's language: the vocabulary of the contents counts at A1–A2. */
  frequency?: FrequencyRanks;
}

/** The options of `rankCandidates` for one goal. */
function rankOptions(o: PoolOptions) {
  return {
    level: o.goal.level,
    difficulty: o.preferences.difficulty,
    contentTypes: o.goal.contentTypes,
    minutes: o.minutes,
    excludeIds: o.excludeIds,
    now: o.now,
    frequency: o.frequency ? { language: o.goal.language, ranks: o.frequency } : undefined,
  };
}

/** Candidates of a goal's language, or null when none is usable. */
export async function loadUsablePool(store: Pick<MissionStore, "listCandidates">, o: PoolOptions): Promise<CandidateContent[] | null> {
  const usable = (pool: CandidateContent[]) =>
    rankCandidates(pool, rankOptions(o)).length > 0;
  // Preferred content types first; any type when none is left (all used, or none published).
  let pool = await store.listCandidates(o.goal.language, {
    contentTypes: o.goal.contentTypes,
    declaredSourceIds: o.declaredSourceIds,
    limit: CANDIDATE_POOL,
  });
  if (!usable(pool)) pool = await store.listCandidates(o.goal.language, { declaredSourceIds: o.declaredSourceIds, limit: CANDIDATE_POOL });
  return usable(pool) ? pool : null;
}

/** The request for one language: ranked candidates, minutes and the production task asked for. */
export function buildSessionRequest(
  o: PoolOptions & { pool: CandidateContent[]; productionMode: GeneratedProductionMode },
): GenerationRequest["sessions"][number] {
  const ranked = rankCandidates(o.pool, rankOptions(o));
  // At A1–A2 the model is shown which words of each teaser are frequent, to pick its expressions from.
  const { language, level } = o.goal;
  const candidates =
    o.frequency && coverageTarget(language, level)
      ? ranked.map((c) => ({ ...c, frequentWords: frequentWords(language, c.summary, o.frequency!, FREQUENT_WORDS_TOP, MAX_FREQUENT_WORDS) }))
      : ranked;
  // Told to the model so it sizes the task; the final plan is made once the exercises exist.
  const estimate = planActivities({
    type: candidates[0].type,
    durationMinutes: candidates[0].durationMinutes,
    minutes: o.minutes,
    questionCount: GENERATION_LIMITS.questions.max,
    expressionCount: GENERATION_LIMITS.expressions.max,
    productionMode: o.productionMode,
  });
  return {
    language: o.goal.language,
    level: o.goal.level,
    targetLevel: o.goal.targetLevel,
    focus: o.goal.focus,
    purpose: o.goal.purpose,
    topics: o.goal.topics,
    minutes: o.minutes,
    productionMode: o.productionMode,
    productionMinutes: estimate.at(-1)!.estimatedMinutes,
    candidates,
  };
}

/** Asks the generator, falling back to the deterministic one when it fails or returns something unusable. */
export async function generateWithFallback(
  request: GenerationRequest,
  { generator, fallback, log }: { generator: ExerciseGenerator; fallback: ExerciseGenerator; log: (message: string) => void },
): Promise<{ result: GenerationResult; sessions: ValidatedSession[]; fallbackReason: string | null }> {
  try {
    const result = await generator.generate(request);
    return { result, sessions: validateGeneratedMission(result, request), fallbackReason: null };
  } catch (error) {
    const { reason, message } = describeError(error);
    log(`generation: ${generator.name} failed (${reason}): ${message}`);
    if (generator.name === fallback.name) throw error;
    const fallbackReason = `${reason}: ${message}`.slice(0, MAX_REASON_LENGTH);
    const result = await fallback.generate(request);
    return { result, sessions: validateGeneratedMission(result, request), fallbackReason };
  }
}

/** A validated session with its activities planned for `minutes`. */
export function planSession(session: ValidatedSession, minutes: number): PlannedSession {
  const activities = planActivities({
    type: session.content.type,
    durationMinutes: session.content.durationMinutes,
    minutes,
    questionCount: session.questions.length,
    expressionCount: session.expressions.length,
    productionMode: session.production.mode,
  }).map((activity) => plannedActivitySchema.parse(activity));
  const production = activities.find((a) => a.kind === productionActivityKind(session.production.mode));
  return {
    language: session.language,
    contentId: session.content.id,
    questions: session.questions,
    expressions: session.expressions,
    // The length asked follows the minutes actually planned (none when there is no room).
    production: production
      ? { ...session.production, targetLength: productionTargetLength(session.production.mode, production.estimatedMinutes) }
      : session.production,
    activities,
  };
}

export function buildMeta(
  result: GenerationResult,
  { durationMs, fallbackReason, coverage }: { durationMs: number; fallbackReason: string | null; coverage?: GenerationMeta["coverage"] },
): GenerationMeta {
  return generationMetaSchema.parse({
    source: result.source,
    model: result.model,
    promptVersion: result.promptVersion,
    inputTokens: result.usage?.inputTokens ?? null,
    outputTokens: result.usage?.outputTokens ?? null,
    durationMs: Math.max(0, Math.round(durationMs)),
    fallbackReason,
    coverage,
  });
}

/**
 * Vocabulary coverage of the content chosen for each session, for the generation trace: it tells,
 * on real missions, whether the targets of `COVERAGE_TARGETS` are realistic for each language.
 */
export function measureCoverage(sessions: readonly ValidatedSession[], frequencies: ReadonlyMap<Language, FrequencyRanks>): GenerationMeta["coverage"] {
  return sessions.flatMap((session) => {
    const ranks = frequencies.get(session.language);
    if (!ranks) return [];
    const text = `${session.content.title}. ${session.content.summary}`;
    return [
      {
        language: session.language,
        contentId: session.content.id,
        top1000: lexicalCoverage(session.language, text, ranks, 1000),
        top2000: lexicalCoverage(session.language, text, ranks, 2000),
      },
    ];
  });
}

export function describeError(error: unknown): { reason: string; message: string } {
  if (error instanceof GenerationError) return { reason: error.reason, message: error.message };
  return { reason: "error", message: error instanceof Error ? error.message : String(error) };
}

/**
 * Writes the mission of one user and day. The row is claimed first (a unique key makes concurrent
 * requests wait rather than generate twice); once claimed, nothing may leave it in "generating":
 * every failure ends in `store.fail`. A generator failure is not a mission failure: the
 * deterministic fallback takes over and the trace says why.
 */
export async function generateMission(input: GenerateMissionInput): Promise<GenerateMissionOutcome> {
  const { userId, date, store, generator } = input;
  const fallback = input.fallback ?? createTemplateGenerator();
  const now = input.now ?? (() => new Date());
  const log = input.log ?? (() => {});

  const preferences = await store.getPreferences(userId);
  if (!preferences) return { status: "no-preferences" };

  const claim = await store.claim(userId, date, preferences.dailyMinutes);
  if (!claim.claimed) {
    if (claim.status === "ready") return { status: "ready", missionId: claim.missionId, source: null };
    if (claim.status === "generating") return { status: "pending", missionId: claim.missionId };
    return { status: "failed", missionId: claim.missionId, reason: "attempts_exhausted" };
  }
  const { missionId } = claim;

  try {
    const startedAt = now();
    const excludeIds = new Set([
      ...(await store.listUsedContentIds(userId, addDays(date, -REUSE_WINDOW_DAYS))),
      ...(await store.listRefusedContentIds(userId)),
    ]);
    const declaredSourceIds = await store.listDeclaredSourceIds(userId);
    const provisional = splitBudget(preferences.dailyMinutes, preferences.goals);

    const frequencies = await loadFrequencies(
      preferences.goals.map((g) => g.language),
      { load: input.loadFrequency, log },
    );
    const pools = new Map<Language, CandidateContent[]>();
    for (const [i, goal] of preferences.goals.entries()) {
      const pool = await loadUsablePool(store, {
        goal,
        preferences,
        frequency: frequencies.get(goal.language),
        declaredSourceIds,
        minutes: provisional[i].minutes,
        excludeIds,
        now: startedAt,
      });
      if (pool) pools.set(goal.language, pool);
    }

    const goals = preferences.goals.filter((g) => pools.has(g.language));
    if (goals.length === 0) {
      await store.fail(missionId, "no content");
      return { status: "no-content" };
    }

    // The whole budget goes to the languages that have content.
    const shares = splitBudget(preferences.dailyMinutes, goals);
    const request: GenerationRequest = generationRequestSchema.parse({
      date,
      sessions: goals.map((goal, index) =>
        buildSessionRequest({
          goal,
          preferences,
          declaredSourceIds,
          frequency: frequencies.get(goal.language),
          minutes: shares[index].minutes,
          excludeIds,
          now: startedAt,
          pool: pools.get(goal.language) ?? [],
          productionMode: chooseProductionMode(date, index),
        }),
      ),
    });

    const { result, sessions, fallbackReason } = await generateWithFallback(request, { generator, fallback, log });
    const planned = sessions.map((session, index) => planSession(session, shares[index].minutes));
    const meta = buildMeta(result, {
      durationMs: now().getTime() - startedAt.getTime(),
      fallbackReason,
      coverage: measureCoverage(sessions, frequencies),
    });
    await store.complete(missionId, planned, meta);
    return { status: "ready", missionId, source: result.source };
  } catch (error) {
    const { reason, message } = describeError(error);
    const short = `${reason}: ${message}`.slice(0, MAX_REASON_LENGTH);
    log(`generation: mission ${missionId} failed: ${short}`);
    try {
      await store.fail(missionId, short);
    } catch (failError) {
      log(`generation: could not mark ${missionId} as failed: ${describeError(failError).message}`);
    }
    return { status: "failed", missionId, reason: short };
  }
}

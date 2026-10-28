import { addDays } from "@/lib/domain/dates";
import type { DateKey, Language } from "@/lib/schemas/common";
import {
  generationRequestSchema,
  type ExerciseGenerator,
  type GenerationMeta,
} from "@/lib/schemas/generation";
import {
  GenerationError,
  SessionNotFoundError,
  SessionReplacementInProgressError,
  SessionReplacementLimitError,
} from "./errors";
import {
  buildMeta,
  buildSessionRequest,
  generateWithFallback,
  loadFrequencies,
  loadUsablePool,
  measureCoverage,
  planSession,
  type FrequencyLoader,
  type MissionStore,
  type PlannedSession,
} from "./generate-mission";
import { chooseProductionMode } from "./plan-activities";
import { createTemplateGenerator } from "./template-generator";

/** Contents already used in the last N days are not proposed again (same window as the mission). */
const REUSE_WINDOW_DAYS = 30;
const MAX_REASON_LENGTH = 300;

/** A user can replace at most this many contents per mission (day). Mirrored by the database default. */
export const MAX_SESSION_REPLACEMENTS_PER_DAY = 3;

/** The session being replaced, as the store knows it. */
export interface ReplaceableSession {
  missionId: string;
  missionDate: DateKey;
  language: Language;
  position: number;
  /** Sum of the estimated minutes of its activities: the new session gets the same share. */
  minutes: number;
}

export interface SessionReplacementStore
  extends Pick<MissionStore, "getPreferences" | "listCandidates" | "listUsedContentIds" | "listRefusedContentIds" | "listDeclaredSourceIds"> {
  /** Null when the session does not exist or is not this user's. */
  getSessionForReplacement(userId: string, sessionId: string): Promise<ReplaceableSession | null>;
  /**
   * Takes one of the day's replacement slots and marks the session as being replaced, atomically.
   * Throws SessionReplacementLimitError when the limit is reached, SessionReplacementInProgressError
   * when a replacement of this session is already running, SessionNotFoundError when it is gone.
   * The slot counts even if the generation fails afterwards.
   */
  reserveReplacement(sessionId: string, userId: string): Promise<void>;
  /** Clears the mark of a reserved session after a failure, so that the user can retry. */
  releaseReplacement(sessionId: string): Promise<void>;
  /**
   * Swaps the reserved session for `session` (same language and position), atomically. Throws
   * SessionNotFoundError when the session is gone.
   */
  replaceSession(sessionId: string, userId: string, session: PlannedSession, meta: GenerationMeta): Promise<void>;
}

export type ReplaceSessionOutcome =
  | { status: "ready" }
  | { status: "no-content" }
  | { status: "limit" }
  | { status: "in-progress" }
  | { status: "not-found" }
  | { status: "failed"; reason: string };

export interface ReplaceSessionInput {
  userId: string;
  sessionId: string;
  store: SessionReplacementStore;
  generator: ExerciseGenerator;
  /** Used when the generator fails or returns something unusable. Default: the template. */
  fallback?: ExerciseGenerator;
  now?: () => Date;
  log?: (message: string) => void;
  /** Word-frequency ranks of a language. Default: the lists of src/lib/frequency. */
  loadFrequency?: FrequencyLoader;
}

/**
 * Replaces the content of one session of the user's mission with another readable one (after
 * « Je n’ai pas accès »). The contents used in the last 30 days and the ones the user refused are
 * excluded, so the content just refused never comes back. The progress of the old session goes
 * with it (cascade), the rest of the mission is untouched.
 */
export async function replaceMissionSession(input: ReplaceSessionInput): Promise<ReplaceSessionOutcome> {
  const { userId, sessionId, store, generator } = input;
  const fallback = input.fallback ?? createTemplateGenerator();
  const now = input.now ?? (() => new Date());
  const log = input.log ?? (() => {});

  const describe = (error: unknown) => {
    const reason =
      error instanceof GenerationError
        ? `${error.reason}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    return reason.slice(0, MAX_REASON_LENGTH);
  };

  let old: ReplaceableSession | null;
  try {
    old = await store.getSessionForReplacement(userId, sessionId);
    if (!old) return { status: "not-found" };
    // Reserved BEFORE any language-model work: the slot is taken under the mission's lock, so
    // parallel requests cannot all reach the generator.
    await store.reserveReplacement(sessionId, userId);
  } catch (error) {
    if (error instanceof SessionReplacementLimitError) return { status: "limit" };
    if (error instanceof SessionReplacementInProgressError) return { status: "in-progress" };
    if (error instanceof SessionNotFoundError) return { status: "not-found" };
    const reason = describe(error);
    log(`generation: replacement of session ${sessionId} failed: ${reason}`);
    return { status: "failed", reason };
  }

  // The slot stays consumed, but the session is released so that the user can retry.
  const release = async () => {
    try {
      await store.releaseReplacement(sessionId);
    } catch (error) {
      log(`generation: could not release session ${sessionId}: ${describe(error)}`);
    }
  };

  try {
    const preferences = await store.getPreferences(userId);
    const goal = preferences?.goals.find((g) => g.language === old.language);
    if (!preferences || !goal) {
      await release();
      return { status: "not-found" };
    }

    const startedAt = now();
    const excludeIds = new Set([
      ...(await store.listUsedContentIds(userId, addDays(old.missionDate, -REUSE_WINDOW_DAYS))),
      ...(await store.listRefusedContentIds(userId)),
    ]);
    const declaredSourceIds = await store.listDeclaredSourceIds(userId);
    const frequencies = await loadFrequencies([goal.language], { load: input.loadFrequency, log });
    // Same inputs as in generateMission: the language's days and its position in the full list.
    const position = preferences.goals.indexOf(goal);
    const options = { goal, preferences, declaredSourceIds, minutes: old.minutes, excludeIds, now: startedAt, frequency: frequencies.get(goal.language) };
    const pool = await loadUsablePool(store, options);
    if (!pool) {
      await release();
      return { status: "no-content" };
    }

    const request = generationRequestSchema.parse({
      date: old.missionDate,
      sessions: [
        buildSessionRequest({
          ...options,
          pool,
          productionMode: chooseProductionMode(old.missionDate, goal.days, position),
        }),
      ],
    });
    const { result, sessions, fallbackReason } = await generateWithFallback(request, { generator, fallback, log });
    const planned = planSession(sessions[0], old.minutes);
    const meta = buildMeta(result, {
      durationMs: now().getTime() - startedAt.getTime(),
      fallbackReason,
      coverage: measureCoverage(sessions, frequencies),
    });
    await store.replaceSession(sessionId, userId, planned, meta);
    return { status: "ready" };
  } catch (error) {
    await release();
    if (error instanceof SessionReplacementLimitError) return { status: "limit" };
    if (error instanceof SessionNotFoundError) return { status: "not-found" };
    const reason = describe(error);
    log(`generation: replacement of session ${sessionId} failed: ${reason}`);
    return { status: "failed", reason };
  }
}

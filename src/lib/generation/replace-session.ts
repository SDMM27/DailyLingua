import { addDays } from "@/lib/domain/dates";
import { DEFAULT_READABLE_ACCESS } from "@/lib/content/policy";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { SourceAccess } from "@/lib/schemas/content";
import {
  generationRequestSchema,
  type ExerciseGenerator,
  type GenerationMeta,
} from "@/lib/schemas/generation";
import { GenerationError, SessionNotFoundError, SessionReplacementLimitError } from "./errors";
import {
  buildMeta,
  buildSessionRequest,
  generateWithFallback,
  loadUsablePool,
  planSession,
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
  /** Replacements already made on this mission. */
  replacements: number;
}

export interface SessionReplacementStore
  extends Pick<MissionStore, "getPreferences" | "listCandidates" | "listUsedContentIds" | "listRefusedContentIds"> {
  /** Null when the session does not exist or is not this user's. */
  getSessionForReplacement(userId: string, sessionId: string): Promise<ReplaceableSession | null>;
  /**
   * Swaps the session for `session` (same language and position), atomically. Throws
   * SessionReplacementLimitError when the day's limit is reached, SessionNotFoundError when the
   * session is gone.
   */
  replaceSession(sessionId: string, userId: string, session: PlannedSession, meta: GenerationMeta): Promise<void>;
}

export type ReplaceSessionOutcome =
  | { status: "ready" }
  | { status: "no-content" }
  | { status: "limit" }
  | { status: "not-found" }
  | { status: "failed"; reason: string };

export interface ReplaceSessionInput {
  userId: string;
  sessionId: string;
  store: SessionReplacementStore;
  generator: ExerciseGenerator;
  /** Used when the generator fails or returns something unusable. Default: the template. */
  fallback?: ExerciseGenerator;
  /** Source access levels the user can read. Default: free sources only. */
  readableAccess?: readonly SourceAccess[];
  now?: () => Date;
  log?: (message: string) => void;
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
  const access = input.readableAccess ?? DEFAULT_READABLE_ACCESS;

  try {
    const old = await store.getSessionForReplacement(userId, sessionId);
    if (!old) return { status: "not-found" };
    if (old.replacements >= MAX_SESSION_REPLACEMENTS_PER_DAY) return { status: "limit" };

    const preferences = await store.getPreferences(userId);
    const goal = preferences?.goals.find((g) => g.language === old.language);
    if (!preferences || !goal) return { status: "not-found" };

    const startedAt = now();
    const excludeIds = new Set([
      ...(await store.listUsedContentIds(userId, addDays(old.missionDate, -REUSE_WINDOW_DAYS))),
      ...(await store.listRefusedContentIds(userId)),
    ]);
    const options = { goal, preferences, access, minutes: old.minutes, excludeIds, now: startedAt };
    const pool = await loadUsablePool(store, options);
    if (!pool) return { status: "no-content" };

    const request = generationRequestSchema.parse({
      date: old.missionDate,
      topics: preferences.topics,
      sessions: [
        buildSessionRequest({
          ...options,
          pool,
          productionMode: chooseProductionMode(old.missionDate, old.position),
        }),
      ],
    });
    const { result, sessions, fallbackReason } = await generateWithFallback(request, { generator, fallback, log });
    const planned = planSession(sessions[0], old.minutes);
    const meta = buildMeta(result, { durationMs: now().getTime() - startedAt.getTime(), fallbackReason });
    await store.replaceSession(sessionId, userId, planned, meta);
    return { status: "ready" };
  } catch (error) {
    if (error instanceof SessionReplacementLimitError) return { status: "limit" };
    if (error instanceof SessionNotFoundError) return { status: "not-found" };
    const reason =
      error instanceof GenerationError
        ? `${error.reason}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    log(`generation: replacement of session ${sessionId} failed: ${reason.slice(0, MAX_REASON_LENGTH)}`);
    return { status: "failed", reason: reason.slice(0, MAX_REASON_LENGTH) };
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/domain/dates";
import { cefrLevelSchema, languageSchema, type DateKey } from "@/lib/schemas/common";
import { productionTaskSchema, type ProductionTask } from "@/lib/schemas/mission";
import { languagePurposeSchema } from "@/lib/schemas/preferences";
import {
  WRITING_FEEDBACK_LIMITS,
  writingFeedbackSchema,
  type WritingFeedback,
  type WritingFeedbackResult,
} from "@/lib/schemas/writing-feedback";
import type { Database } from "@/lib/supabase/database.types";
import { GenerationError } from "./errors";
import type { WritingReview, WritingReviewer } from "./writing-feedback";
import type { WritingFeedbackRequest } from "./writing-feedback-prompt";

/** What the service needs to know about a session before calling the model. */
export interface FeedbackSession {
  missionDate: DateKey;
  /** Everything but the text, which comes from the request. */
  request: Omit<WritingFeedbackRequest, "text" | "mode">;
  mode: ProductionTask["mode"];
  previous: { feedback: WritingFeedback; body: string } | null;
  attempts: number;
}

export interface WritingFeedbackStore {
  /** The session of `userId`, or null when it does not exist or belongs to someone else. */
  loadSession(userId: string, sessionId: string): Promise<FeedbackSession | null>;
  /** Counts one attempt; returns the new count, or null when none is left. */
  claimAttempt(userId: string, sessionId: string): Promise<number | null>;
  saveReview(userId: string, sessionId: string, body: string, review: WritingReview): Promise<void>;
}

export type WritingFeedbackOutcome =
  | WritingFeedbackResult
  /** The session is not the user's, is a (legacy) speaking-only task, or is older than yesterday. */
  | { status: "not-found" | "not-writing" | "expired" };

export interface RequestWritingFeedbackInput {
  userId: string;
  sessionId: string;
  /** Already validated against `requestWritingFeedbackInputSchema`. */
  body: string;
  /** The user's today, in their time zone. */
  today: DateKey;
}

const MAX = WRITING_FEEDBACK_LIMITS.attemptsPerSession;

/**
 * Reviews the written production of a session. Never throws for a model failure: the review is
 * simply `unavailable` and the task stays done. Reviews are limited to the missions of today and
 * yesterday (a text finished just after midnight still counts), to `attemptsPerSession` calls per
 * session, and the same text is never sent twice: its stored review is returned instead.
 */
export async function requestWritingFeedback(
  input: RequestWritingFeedbackInput,
  deps: { store: WritingFeedbackStore; reviewer: WritingReviewer; log?: (message: string) => void },
): Promise<WritingFeedbackOutcome> {
  const { userId, sessionId, body, today } = input;
  const { store, reviewer, log } = deps;

  const session = await store.loadSession(userId, sessionId);
  if (!session) return { status: "not-found" };
  // A spoken task is written first, so it can be reviewed; only the former speech-only task cannot.
  if (session.mode === "speaking") return { status: "not-writing" };
  if (session.missionDate !== today && session.missionDate !== addDays(today, -1)) return { status: "expired" };

  if (session.previous && session.previous.body === body) {
    return {
      status: "ready",
      feedback: session.previous.feedback,
      reviewedText: body,
      attemptsLeft: Math.max(0, MAX - session.attempts),
    };
  }

  const attempts = await store.claimAttempt(userId, sessionId);
  if (attempts === null) return { status: "limit" };
  const attemptsLeft = Math.max(0, MAX - attempts);

  let review: WritingReview;
  try {
    review = await reviewer.review({ ...session.request, mode: session.mode, text: body });
  } catch (error) {
    // Only the reason and our own message: never the raw error (see GenerationError).
    const reason = error instanceof GenerationError ? `${error.reason}: ${error.message}` : "unexpected error";
    log?.(`writing feedback unavailable (session ${sessionId}): ${reason}`);
    return { status: "unavailable", attemptsLeft };
  }

  try {
    await store.saveReview(userId, sessionId, body, review);
  } catch (error) {
    // The review was paid for: show it anyway, it is only missing from the history.
    log?.(`writing feedback not saved (session ${sessionId}): ${error instanceof Error ? error.message : "unknown"}`);
  }
  return { status: "ready", feedback: review.feedback, reviewedText: body, attemptsLeft };
}

type Client = SupabaseClient<Database>;

/** Store on Supabase. `client` must be the service role: the review table is read-only for users. */
export function createSupabaseWritingFeedbackStore(client: Client): WritingFeedbackStore {
  return {
    async loadSession(userId, sessionId) {
      const { data: row, error } = await client
        .from("mission_sessions")
        .select("language, production, missions ( mission_date ), contents ( difficulty )")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`Supabase (session à corriger) : ${error.message}`);
      if (!row?.missions || !row.contents) return null;

      const [goal, existing] = await Promise.all([
        client
          .from("user_languages")
          .select("level, target_level, purpose")
          .eq("user_id", userId)
          .eq("language", row.language)
          .maybeSingle(),
        client
          .from("writing_feedback")
          .select("attempts, body, feedback")
          .eq("session_id", sessionId)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (goal.error) throw new Error(`Supabase (objectif de langue) : ${goal.error.message}`);
      if (existing.error) throw new Error(`Supabase (correction existante) : ${existing.error.message}`);

      const production = productionTaskSchema.parse(row.production);
      // The language may have been removed from the preferences since: fall back on the content's level.
      const level = cefrLevelSchema.parse(goal.data?.level ?? row.contents.difficulty);
      const stored = existing.data?.feedback ? writingFeedbackSchema.safeParse(existing.data.feedback) : null;
      return {
        missionDate: row.missions.mission_date,
        mode: production.mode,
        attempts: existing.data?.attempts ?? 0,
        previous: stored?.success && existing.data?.body ? { feedback: stored.data, body: existing.data.body } : null,
        request: {
          language: languageSchema.parse(row.language),
          level,
          targetLevel: cefrLevelSchema.parse(goal.data?.target_level ?? level),
          purpose: languagePurposeSchema.parse(goal.data?.purpose ?? "general"),
          task: production.prompt,
          targetLength: production.targetLength,
        },
      };
    },

    async claimAttempt(userId, sessionId) {
      const { data, error } = await client.rpc("claim_writing_feedback_attempt", {
        p_session_id: sessionId,
        p_user_id: userId,
      });
      if (error) throw new Error(`Supabase (tentative de correction) : ${error.message}`);
      return data ?? null;
    },

    async saveReview(userId, sessionId, body, review) {
      const { error } = await client
        .from("writing_feedback")
        .update({
          body,
          feedback: review.feedback,
          model: review.model,
          prompt_version: review.promptVersion,
          input_tokens: review.usage.inputTokens,
          output_tokens: review.usage.outputTokens,
          reviewed_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("user_id", userId);
      if (error) throw new Error(`Supabase (enregistrement de la correction) : ${error.message}`);
    },
  };
}

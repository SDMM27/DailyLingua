import "server-only";
import type { DateKey } from "@/lib/schemas/common";
import type { VocabularyTranslationResult } from "@/lib/schemas/vocabulary";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readGuestDailyMissionCap, readVocabularyTranslationConfig, readWritingFeedbackConfig } from "./config";
import type { GenerateMissionOutcome } from "./generate-mission";
import { createMissionPreparer, createSessionReplacer } from "./preparer";
import type { ReplaceSessionOutcome } from "./replace-session";
import {
  createClaudeVocabularyTranslator,
  createSupabaseVocabularyTranslationStore,
  translateVocabulary,
  type TranslateVocabularyRequest,
} from "./vocabulary-translation";
import { createClaudeWritingReviewer } from "./writing-feedback";
import {
  createSupabaseWritingFeedbackStore,
  requestWritingFeedback,
  type RequestWritingFeedbackInput,
  type WritingFeedbackOutcome,
} from "./writing-feedback-service";

/**
 * Writes the mission of `userId` for `date` with the service role. Only call it with the id of
 * the signed-in user (the repository does): the admin client bypasses RLS.
 */
export async function prepareMission(userId: string, date: DateKey): Promise<GenerateMissionOutcome> {
  return createMissionPreparer(createSupabaseAdminClient(), { log: console.warn })(userId, date);
}

/**
 * Reserves the mission of guest `userId` for `date` against GUEST_DAILY_MISSION_CAP: false once all
 * guests together reserved that many missions over the last 24 hours. The reservation is kept in a
 * log that deleting or upgrading the account does not touch, and taken atomically, so concurrent
 * requests cannot overshoot. Asking again for the same guest and day returns true without counting.
 */
export async function reserveGuestMission(userId: string, date: DateKey): Promise<boolean> {
  const cap = readGuestDailyMissionCap();
  if (cap === null) return true;
  const { data, error } = await createSupabaseAdminClient().rpc("reserve_guest_mission", {
    p_user_id: userId,
    p_date: date,
    p_cap: cap,
  });
  if (error) throw new Error(`Supabase (missions des invités) : ${error.message}`);
  return data;
}

/**
 * Replaces one session of the mission of `userId` with another readable content. Same rule as
 * `prepareMission`: only with the signed-in user id (the repository first reads the session
 * through RLS, which proves it is theirs).
 */
export async function replaceSession(userId: string, sessionId: string): Promise<ReplaceSessionOutcome> {
  return createSessionReplacer(createSupabaseAdminClient(), { log: console.warn })(userId, sessionId);
}

/**
 * Reviews a written production with the service role, or null when the review is off (no API key,
 * or WRITING_FEEDBACK=off). Same rule as `prepareMission`: only with the signed-in user's id.
 */
export function writingFeedbackReviewer():
  | ((input: RequestWritingFeedbackInput) => Promise<WritingFeedbackOutcome>)
  | null {
  const config = readWritingFeedbackConfig();
  if (!config.enabled) return null;
  return (input) =>
    requestWritingFeedback(input, {
      store: createSupabaseWritingFeedbackStore(createSupabaseAdminClient()),
      reviewer: createClaudeWritingReviewer({ apiKey: config.apiKey, model: config.model }),
      log: console.warn,
    });
}

/**
 * Translates imported words with the service role, or null when the translation is off (no API
 * key, or VOCABULARY_TRANSLATION=off). Same rule as `prepareMission`: only with the signed-in
 * user's id.
 */
export function vocabularyTranslator(): ((input: TranslateVocabularyRequest) => Promise<VocabularyTranslationResult>) | null {
  const config = readVocabularyTranslationConfig();
  if (!config.enabled) return null;
  return (input) =>
    translateVocabulary(input, {
      store: createSupabaseVocabularyTranslationStore(createSupabaseAdminClient()),
      translator: createClaudeVocabularyTranslator({ apiKey: config.apiKey, model: config.model }),
      log: console.warn,
    });
}

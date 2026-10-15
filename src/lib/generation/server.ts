import "server-only";
import type { DateKey } from "@/lib/schemas/common";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readWritingFeedbackConfig } from "./config";
import type { GenerateMissionOutcome } from "./generate-mission";
import { createMissionPreparer } from "./preparer";
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

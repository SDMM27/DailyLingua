import { appSchema, type AppClient } from "./client";
import { unwrap } from "./query";

export const feedbackCategories = ["bug", "idee", "contenu", "autre"] as const;
export type FeedbackCategory = (typeof feedbackCategories)[number];

export interface FeedbackInput {
  category: FeedbackCategory;
  message: string;
  /** Path of the screen the feedback comes from (200 characters at most). */
  page?: string;
  /** Short hash of the deployed version (40 characters at most). */
  appVersion?: string;
}

/**
 * Sends a feedback in the name of the signed-in user (`app.send_feedback`, into `public.feedback`). The database
 * validates everything and refuses more than 20 a day: a `DataError` with the code `rate_limited`.
 */
export async function sendFeedback(client: AppClient, input: FeedbackInput): Promise<void> {
  unwrap(
    await appSchema(client).rpc("send_feedback", {
      p_category: input.category,
      p_message: input.message,
      p_page: input.page,
      p_app_version: input.appVersion,
    }),
  );
}

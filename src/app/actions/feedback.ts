"use server";

import { feedbackInputSchema } from "@/lib/schemas/feedback";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/** Sends a feedback. The database refuses more than 20 per user over 24 hours (see the repository). */
export async function sendFeedback(input: unknown): Promise<ActionResult> {
  return runAction(feedbackInputSchema, input, (repo, data) => repo.sendFeedback(data));
}

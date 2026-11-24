"use server";

import { feedbackCategories, sendFeedback } from "@dailylingua/data";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appVersion } from "@/lib/app-version";
import { saveErrorKey, type SaveErrorKey } from "@/lib/data-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** What the feedback form gets back. `attempt` changes at every answer so that the form can reset its fields. */
export type FeedbackState = {
  attempt: number;
  sent?: true;
  error?: SaveErrorKey;
  /** Kept after an error so that the learner does not lose what they typed. */
  category?: string;
  message?: string;
};

const feedbackSchema = z.object({
  category: z.enum(feedbackCategories),
  message: z.string().trim().min(3).max(2000),
  // The path of the screen: internal, short. Anything else is dropped rather than refused.
  page: z.string().max(200).regex(/^\/[^\s]*$/).optional().catch(undefined),
});

/** Sends a feedback from the settings screen; the version is the one of this deployment, never a client value. */
export async function sendFeedbackAction(previous: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const attempt = previous.attempt + 1;
  const category = String(formData.get("category") ?? "");
  const message = String(formData.get("message") ?? "");
  const parsed = feedbackSchema.safeParse({ category, message, page: formData.get("page") ?? undefined });
  if (!parsed.success) return { attempt, error: "invalid", category, message };

  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/sign-in");
  try {
    await sendFeedback(client, { ...parsed.data, appVersion: appVersion() });
  } catch (error) {
    console.error("sendFeedback failed", error);
    return { attempt, error: saveErrorKey(error), category, message };
  }
  return { attempt, sent: true };
}

import { writingFeedbackResponseSchema, type WritingFeedbackResponse } from "@dailylingua/schemas";
import { ACCOUNT_HEADER } from "./account";

export interface LocalWritingFeedback {
  productionId: string;
  clientEventId: string;
  sessionId: string;
  createdAt: string;
  /** A spoken production keeps its transcript, shown above the correction (« Ce que ton téléphone a compris »). */
  spoken?: { transcript: string };
  response?: WritingFeedbackResponse;
  retryAfter?: number;
  attempts?: Record<number, string>;
}

export async function requestWritingFeedback(userId: string, productionId: string, signal: AbortSignal) {
  const response = await fetch(`/api/production/${productionId}/feedback`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { [ACCOUNT_HEADER]: userId },
    signal,
  });
  return writingFeedbackResponseSchema.parse(await response.json());
}

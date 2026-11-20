import { createWritingFeedbackStore } from "@dailylingua/data";
import { createExpressionAi } from "@/lib/expression/ai-server";
import { createFeedbackHandler } from "@/lib/expression/feedback-route";
import { requestWritingFeedback } from "@/lib/expression/writing-feedback";
import { createIngestStore, ingestEvents } from "@/lib/ingest/ingest-events";
import { getSessionUser } from "@/lib/session";
import { recordErrorOfTheDay } from "@/lib/session-packet/error-of-day";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const feedbackHandler = createFeedbackHandler({
  getUser: getSessionUser,
  now: () => new Date(),
  requestFeedback(input) {
    const service = getSupabaseServiceClient();
    return requestWritingFeedback(input, {
      store: createWritingFeedbackStore(service),
      getAi: () => createExpressionAi(service),
      recordError: (input) => recordErrorOfTheDay(service, input),
      reconcile: (userId, feedbackTarget, now) => ingestEvents({
        store: createIngestStore(service), userId, events: [], feedbackTarget, now,
      }),
    });
  },
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return feedbackHandler(request, (await context.params).id);
}

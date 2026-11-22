import { writingFeedbackResponseSchema, type WritingFeedbackResponse } from "@dailylingua/schemas";
import { z } from "zod";
import { isSameOrigin } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";

const statusCodes = {
  ready: 200,
  pending: 202,
  not_found: 404,
  limit: 429,
  unavailable: 503,
  disabled: 503,
  invalid_production: 422,
  failed: 422,
  unauthenticated: 401,
  forbidden: 403,
} as const;

function json(body: WritingFeedbackResponse): Response {
  return Response.json(writingFeedbackResponseSchema.parse(body), {
    status: statusCodes[body.status],
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function createFeedbackHandler(deps: {
  getUser(): Promise<{ id: string; isGuest?: boolean } | null>;
  requestFeedback(input: { userId: string; productionId: string; now: Date; isGuest?: boolean }): Promise<WritingFeedbackResponse>;
  now(): Date;
}) {
  return async function POST(request: Request, productionId: string): Promise<Response> {
    if (!isSameOrigin(request)) return json({ status: "forbidden" });
    if (!z.uuid().safeParse(productionId).success) return json({ status: "not_found" });
    try {
      const user = await deps.getUser();
      if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) return json({ status: "unauthenticated" });
      return json(await deps.requestFeedback({ userId: user.id, productionId: productionId.toLowerCase(), now: deps.now(),
        ...(user.isGuest ? { isGuest: true } : {}) }));
    } catch {
      // Internal exceptions and the model's output can contain learner text.
      return json({ status: "unavailable" });
    }
  };
}

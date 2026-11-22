import { claimEventRate, createRewriteCheckStore } from "@dailylingua/data";
import { createExpressionAi } from "@/lib/expression/ai-server";
import { createEventsHandler } from "@/lib/ingest/events-route";
import { createIngestStore, ingestEvents } from "@/lib/ingest/ingest-events";
import { createRewriteChecks } from "@/lib/ingest/rewrite-checks";
import { getSessionUser } from "@/lib/session";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

// Node runtime (the default): the service key and the database client never run on the edge.
// The handler reads the cookie, so it is always dynamic; nothing it answers is cached.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * `POST /api/events`: the learner's events, decided by the server (`j2-architecture.md` section 1). The logic and its
 * order are in `lib/ingest/events-route.ts`; this file binds the real dependencies.
 */
export const POST = createEventsHandler({
  getUser: getSessionUser,
  claimRate: (userId, count, limit) => claimEventRate(getSupabaseServiceClient(), userId, count, limit),
  ingest: ({ userId, events, now, isGuest }) => {
    const service = getSupabaseServiceClient();
    const ai = isGuest ? null : createExpressionAi(service);
    const checkRewrites = ai ? createRewriteChecks(createRewriteCheckStore(service), ai) : undefined;
    return ingestEvents({ store: createIngestStore(service, checkRewrites), userId, events, now });
  },
  now: () => new Date(),
});

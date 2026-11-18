import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createTodayHandler, createTodayStore } from "@/lib/session-packet/today-route";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

// Node runtime (the default); the date and the cookie are per request, and nothing is cached.
export const dynamic = "force-dynamic";

/**
 * `GET /api/session/today?language=xx`: creates the session of the day once and serves its packet, answer keys
 * included (`j2-architecture.md` section 5). The logic is in `lib/session-packet/today-route.ts`.
 */
export const GET = createTodayHandler({
  getUser: getSessionUser,
  store: createTodayStore(getSupabaseServiceClient),
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
  connection,
});

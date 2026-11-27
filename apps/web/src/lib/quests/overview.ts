import type { AppClient } from "@dailylingua/data";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshGameState } from "./refresh";

/**
 * `GET /api/quests`: creates and settles the learner's quests (and closes the immersion days that are due), then answers
 * `{ quests, closedImmersionDays, newBadges }` (quests null when the switch is off; the closing runs whatever that switch says). The pages load it from the browser, since only API routes hold the service role.
 */
export async function getQuestsRequest(request: Request, getService: () => AppClient): Promise<Response> {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
    const { quests, closedImmersionDays, newBadges } = await refreshGameState(getService(), user.id, new Date());
    return Response.json({ quests, closedImmersionDays, newBadges }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Loading the quests failed", error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

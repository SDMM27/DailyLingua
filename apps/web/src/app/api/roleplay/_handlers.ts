import "server-only";

import { createRoleplayStore } from "@dailylingua/data";
import { createExpressionAi } from "@/lib/expression/ai-server";
import { getSessionUser } from "@/lib/session";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createRoleplayHandlers } from "@/lib/roleplay/roleplay-routes";
import { finishRoleplay, playRoleplayTurn, readRoleplayState, startRoleplay, type RoleplayDeps } from "@/lib/roleplay/roleplay-service";

/** The real dependencies of the role play routes: the service-role store (every call filtered by the session's user) and the gateway. */
function deps(): RoleplayDeps {
  const service = getSupabaseServiceClient();
  return { store: createRoleplayStore(service), getAi: () => createExpressionAi(service), now: () => new Date() };
}

export const roleplayHandlers = createRoleplayHandlers({
  getUser: getSessionUser,
  state: (caller, language) => readRoleplayState(caller, language, deps()),
  start: (caller, request) => startRoleplay(caller, request, deps()),
  turn: (caller, gameId, request) => playRoleplayTurn(caller, gameId, request, deps()),
  finish: (caller, gameId) => finishRoleplay(caller, gameId, deps()),
});

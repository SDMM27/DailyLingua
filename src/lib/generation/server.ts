import "server-only";
import type { DateKey } from "@/lib/schemas/common";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GenerateMissionOutcome } from "./generate-mission";
import { createMissionPreparer } from "./preparer";

/**
 * Writes the mission of `userId` for `date` with the service role. Only call it with the id of
 * the signed-in user (the repository does): the admin client bypasses RLS.
 */
export async function prepareMission(userId: string, date: DateKey): Promise<GenerateMissionOutcome> {
  return createMissionPreparer(createSupabaseAdminClient(), { log: console.warn })(userId, date);
}

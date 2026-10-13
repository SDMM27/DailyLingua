import "server-only";
import { readContentLicensePolicy } from "@/lib/content/policy";
import type { DateKey } from "@/lib/schemas/common";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readGenerationConfig } from "./config";
import { createClaudeGenerator } from "./claude-generator";
import { generateMission, type GenerateMissionOutcome } from "./generate-mission";
import { createSupabaseMissionStore } from "./supabase-store";
import { createTemplateGenerator } from "./template-generator";

/**
 * Writes the mission of `userId` for `date` with the service role. Only call it with the id of
 * the signed-in user (the repository does): the admin client bypasses RLS.
 */
export async function prepareMission(userId: string, date: DateKey): Promise<GenerateMissionOutcome> {
  const config = readGenerationConfig();
  return generateMission({
    userId,
    date,
    store: createSupabaseMissionStore(createSupabaseAdminClient(), { policy: readContentLicensePolicy() }),
    generator:
      config.provider === "claude"
        ? createClaudeGenerator({ apiKey: config.apiKey, model: config.model })
        : createTemplateGenerator(),
    log: console.warn,
  });
}

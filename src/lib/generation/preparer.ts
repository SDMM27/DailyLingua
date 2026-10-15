import type { SupabaseClient } from "@supabase/supabase-js";
import { readContentLicensePolicy } from "@/lib/content/policy";
import type { DateKey } from "@/lib/schemas/common";
import type { ExerciseGenerator } from "@/lib/schemas/generation";
import type { Database } from "@/lib/supabase/database.types";
import { createClaudeGenerator } from "./claude-generator";
import { readGenerationConfig } from "./config";
import { generateMission, type GenerateMissionOutcome } from "./generate-mission";
import { createSupabaseMissionStore } from "./supabase-store";
import { createTemplateGenerator } from "./template-generator";

export interface MissionPreparerOptions {
  /** Default: Claude when configured, the template otherwise (see readGenerationConfig). */
  generator?: ExerciseGenerator;
  log?: (message: string) => void;
}

/**
 * Builds the function that writes the mission of a user for a day. `client` must be the service
 * role: the mission is written on behalf of the user. Shared by the app, the cron jobs and the
 * CLI script, so it must not import Next.js, React or server-only.
 */
export function createMissionPreparer(
  client: SupabaseClient<Database>,
  options: MissionPreparerOptions = {},
): (userId: string, date: DateKey) => Promise<GenerateMissionOutcome> {
  // Configuration errors surface when the preparer is built, not on the first user.
  const policy = readContentLicensePolicy();
  let generator = options.generator;
  if (!generator) {
    const config = readGenerationConfig();
    generator =
      config.provider === "claude"
        ? createClaudeGenerator({ apiKey: config.apiKey, model: config.model })
        : createTemplateGenerator();
  }
  const store = createSupabaseMissionStore(client, { policy });
  const { log } = options;
  return (userId, date) => generateMission({ userId, date, store, generator, log });
}

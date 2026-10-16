import type { SupabaseClient } from "@supabase/supabase-js";
import { readContentLicensePolicy } from "@/lib/content/policy";
import type { DateKey } from "@/lib/schemas/common";
import type { ExerciseGenerator } from "@/lib/schemas/generation";
import type { Database } from "@/lib/supabase/database.types";
import { createClaudeGenerator } from "./claude-generator";
import { readGenerationConfig } from "./config";
import { generateMission, type GenerateMissionOutcome } from "./generate-mission";
import { replaceMissionSession, type ReplaceSessionOutcome } from "./replace-session";
import { createSupabaseMissionStore } from "./supabase-store";
import { createTemplateGenerator } from "./template-generator";

export interface MissionPreparerOptions {
  /** Default: Claude when configured, the template otherwise (see readGenerationConfig). */
  generator?: ExerciseGenerator;
  log?: (message: string) => void;
}

function resolveGenerator(options: MissionPreparerOptions): ExerciseGenerator {
  if (options.generator) return options.generator;
  const config = readGenerationConfig();
  return config.provider === "claude"
    ? createClaudeGenerator({ apiKey: config.apiKey, model: config.model })
    : createTemplateGenerator();
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
  const generator = resolveGenerator(options);
  const store = createSupabaseMissionStore(client, { policy });
  const { log } = options;
  return (userId, date) => generateMission({ userId, date, store, generator, log });
}

/**
 * Builds the function that replaces one session of a user's mission with another readable
 * content, with the same generator, store and licence policy as the preparer. Same rules: `client`
 * is the service role, and it must only be called for the signed-in user.
 */
export function createSessionReplacer(
  client: SupabaseClient<Database>,
  options: MissionPreparerOptions = {},
): (userId: string, sessionId: string) => Promise<ReplaceSessionOutcome> {
  const policy = readContentLicensePolicy();
  const generator = resolveGenerator(options);
  const store = createSupabaseMissionStore(client, { policy });
  const { log } = options;
  return (userId, sessionId) => replaceMissionSession({ userId, sessionId, store, generator, log });
}

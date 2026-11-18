import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { AppClient, AppDatabase } from "@dailylingua/data";
import { z } from "zod";
import { getSupabaseEnv } from "./env";

/**
 * The service-role client: it bypasses Row Level Security, so it exists for ONE purpose, the two ingestion routes
 * (`POST /api/events`, `GET /api/session/today`), which always pass the user id they validated themselves. It is
 * never created for a page, an action or a component. The key has its own schema: it never goes through
 * `readSupabaseEnv` and never carries the `NEXT_PUBLIC_` prefix, so it cannot reach the browser.
 */
const serviceEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "missing or too short"),
});

export function readServiceRoleKey(source: Record<string, string | undefined> = process.env): string {
  const parsed = serviceEnvSchema.safeParse({ SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined });
  if (!parsed.success) throw new Error(`Invalid service role environment variable:\n${z.prettifyError(parsed.error)}`);
  return parsed.data.SUPABASE_SERVICE_ROLE_KEY;
}

/** A client with no session of its own (nothing is persisted or refreshed), scoped to the `app` schema. */
export function createSupabaseServiceClient(source: Record<string, string | undefined> = process.env): AppClient {
  const url = getSupabaseEnv().NEXT_PUBLIC_SUPABASE_URL;
  return createClient<AppDatabase>(url, readServiceRoleKey(source), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "app" },
  }) as unknown as AppClient;
}

let cached: AppClient | undefined;

/** The one service client of the process (it holds no per-request state). */
export function getSupabaseServiceClient(): AppClient {
  cached ??= createSupabaseServiceClient();
  return cached;
}

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client with the service role key: bypasses RLS. Only for trusted server code
 * (content ingestion, daily generation job). Never import it from a component or a page
 * that acts on behalf of a user; use `createSupabaseServerClient` there.
 */
export function createSupabaseAdminClient() {
  const env = getSupabaseEnv();
  if (!env?.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY est requis pour le client administrateur Supabase.");
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

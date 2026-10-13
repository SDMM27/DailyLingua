/** Runs once when the server starts: fail fast, with a clear message, on invalid Supabase variables. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getSupabaseEnv } = await import("@/lib/supabase/env");
    getSupabaseEnv();
  }
}

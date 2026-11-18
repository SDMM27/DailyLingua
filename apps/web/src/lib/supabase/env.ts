import { z } from "zod";

/**
 * Supabase variables, validated on the server. The app has no demo mode: without them it cannot
 * do anything, so a missing or malformed value fails loudly. The service-role key is deliberately
 * not read here: this app only ever acts as the signed-in user (RLS).
 */
const supabaseEnvSchema = z.object({
  /** Public: sent to the browser. */
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    protocol: /^https?$/,
    error: "must be a full http(s) URL, e.g. http://127.0.0.1:54321",
  }),
  /** Public: sent to the browser. A legacy anon key (JWT) or a `sb_publishable_…` key. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "missing or too short"),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

export function readSupabaseEnv(source: Record<string, string | undefined> = process.env): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Invalid Supabase environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

let cached: SupabaseEnv | undefined;

/** Memoised `readSupabaseEnv(process.env)`. */
export function getSupabaseEnv(): SupabaseEnv {
  cached ??= readSupabaseEnv();
  return cached;
}

import "server-only";
import { z } from "zod";

/**
 * Supabase environment variables, validated once on the server.
 * No variable set = Supabase is disabled and the app runs on demo data.
 * A partial or malformed configuration fails loudly instead of silently falling back.
 */
const supabaseEnvSchema = z.object({
  /** Public: sent to the browser. */
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    protocol: /^https?$/,
    error: "doit être une URL http(s) complète, ex. http://127.0.0.1:54321",
  }),
  /** Public: sent to the browser. A legacy anon key (JWT) or a `sb_publishable_…` key. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "clé manquante ou trop courte"),
  /** Secret: server only, bypasses RLS. A legacy service_role key or a `sb_secret_…` key. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "clé trop courte").optional(),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

const KEYS = Object.keys(supabaseEnvSchema.shape) as (keyof SupabaseEnv)[];

/** Returns null when no Supabase variable is set, throws a readable error when the set is invalid. */
export function readSupabaseEnv(source: Record<string, string | undefined> = process.env): SupabaseEnv | null {
  // `KEY=` in a .env file means "unset".
  const raw = Object.fromEntries(KEYS.map((key) => [key, source[key]?.trim() || undefined]));
  if (Object.values(raw).every((value) => value === undefined)) return null;

  const parsed = supabaseEnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Variables d'environnement Supabase invalides (voir .env.example) :\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}

let cached: { value: SupabaseEnv | null } | undefined;

/** Memoised `readSupabaseEnv(process.env)`. */
export function getSupabaseEnv(): SupabaseEnv | null {
  cached ??= { value: readSupabaseEnv() };
  return cached.value;
}

import { createServerClient } from "@supabase/ssr";
import type { AppClient, AppDatabase } from "@dailylingua/data";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client acting as the signed-in user (anon key + session cookies), so RLS applies.
 * This is the only kind of client the app creates: there is no service role here.
 */
export async function createSupabaseServerClient(): Promise<AppClient> {
  const env = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<AppDatabase>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy (src/proxy.ts) refreshes the session.
        }
      },
    },
  });
}

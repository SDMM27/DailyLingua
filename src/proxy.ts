import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Reachable without an account. Everything else needs a session when Supabase is configured.
 * The scheduled job routes check their own secret (CRON_SECRET) and must not be redirected;
 * /api/health is the public liveness probe (it checks the database only with that same secret).
 */
const PUBLIC_PATHS = ["/connexion", "/auth/confirm", "/installer", "/api/cron", "/api/health"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Keeps the Supabase session fresh (refreshed cookies must be written on the response, which
 * Server Components cannot do) and sends signed-out visitors to the sign-in screen.
 * This is an optimistic check on the JWT only: authorisation is Row Level Security, and
 * `getRepository()` re-validates the user on every page.
 * Without Supabase configuration the app is the public demo and nothing is redirected.
 */
export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublic(pathname)) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  // A signed-in visitor of /connexion is sent home by the page itself, after validating the user:
  // the JWT alone can outlive its account (database reset, deleted account) and would loop here.
  return response;
}

export const config = {
  // Not the build assets, nor the generated icons and manifest (they must load before sign-in).
  matcher: ["/((?!_next/static|_next/image|icon|apple-icon|manifest.webmanifest|favicon.ico).*)"],
};

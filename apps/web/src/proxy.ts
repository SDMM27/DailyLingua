import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublic } from "@/lib/auth/public-paths";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Keeps the Supabase session fresh (refreshed cookies must be written on the response, which
 * Server Components cannot do) and sends signed-out visitors to the sign-in screen.
 * This is an optimistic check on the JWT only: authorisation is Row Level Security, and every page
 * re-validates the user with Supabase Auth.
 */
export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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

  if (!signedIn && !isPublic(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  // A signed-in visitor of /sign-in is sent home by the page itself, after validating the user:
  // the JWT alone can outlive its account (database reset, deleted account) and would loop here.
  return response;
}

export const config = {
  // Not the build assets, nor the icon and the manifest (they must load before sign-in).
  matcher: ["/((?!_next/static|_next/image|icon|apple-icon|manifest.webmanifest|favicon.ico).*)"],
};

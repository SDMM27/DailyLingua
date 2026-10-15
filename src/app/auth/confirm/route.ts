import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/security/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];
const NEW_PASSWORD_PATH = "/nouveau-mot-de-passe";

/**
 * Landing page of the links e-mailed by Supabase. Two shapes:
 * - `token_hash` + `type` (our own e-mail templates, independent of the browser);
 * - `code` (PKCE: the default templates, which only works in the browser that started the flow).
 * `next` (internal path only) is where to go afterwards.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = OTP_TYPES.find((t) => t === params.get("type"));
  const next = safeNextPath(params.get("next"), type === "recovery" ? NEW_PASSWORD_PATH : "/");
  const recovery = next === NEW_PASSWORD_PATH;
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url));

  // Supabase reports an expired or already used link with error / error_code.
  if (params.get("error") || params.get("error_code")) {
    return go(recovery ? "/mot-de-passe-oublie?lien=invalide" : "/connexion?lien=invalide");
  }

  const supabase = await createSupabaseServerClient();
  const tokenHash = params.get("token_hash");
  const code = params.get("code");

  if (supabase && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return go(next);
    return go(recovery ? "/mot-de-passe-oublie?lien=invalide" : "/connexion?lien=invalide");
  }

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return go(next);
    // With the default template Supabase has already confirmed the address before redirecting here;
    // the usual failure is a link opened in Safari after signing up in the installed app (separate
    // cookies, so no PKCE verifier): the account is fine, only the session is missing.
    return go(recovery ? "/mot-de-passe-oublie?lien=invalide" : "/connexion?lien=confirme");
  }

  return go("/connexion?lien=invalide");
}

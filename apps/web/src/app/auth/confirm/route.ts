import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Landing page of the links e-mailed by Supabase. Two shapes:
 * - `token_hash` + `type` (our own e-mail templates, independent of the browser);
 * - `code` (PKCE: the default templates, which only works in the browser that started the flow).
 * `next` (internal path only) is where to go afterwards. Password recovery is out of scope for
 * now: a recovery link ends on the sign-in screen like any failed one.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = OTP_TYPES.find((t) => t === params.get("type"));
  const next = safeNextPath(params.get("next"), "/");
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url));

  // Supabase reports an expired or already used link with error / error_code.
  if (params.get("error") || params.get("error_code")) return go("/sign-in?link=invalid");

  const supabase = await createSupabaseServerClient();
  const tokenHash = params.get("token_hash");
  const code = params.get("code");

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return go(error ? "/sign-in?link=invalid" : next);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // With the default template Supabase has already confirmed the address before redirecting here;
    // the usual failure is a link opened in another browser than the one that signed up (no PKCE
    // verifier): the account is fine, only the session is missing.
    return go(error ? "/sign-in?link=confirmed" : next);
  }

  return go("/sign-in?link=invalid");
}

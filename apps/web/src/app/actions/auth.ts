"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authErrorCode, signInSchema, signUpSchema, type AuthErrorCode } from "@/lib/auth/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** What a form gets back: an error code to translate, or a notice, plus the e-mail to keep in the field. */
export type AuthFormState = { error?: AuthErrorCode; notice?: "checkEmail"; email?: string };

/** Longest Turnstile token accepted from a form (they are about 1 000 characters). */
const MAX_CAPTCHA_TOKEN_LENGTH = 2048;

/** The Turnstile token posted by the form, if any (empty or oversized values are ignored). */
function captchaTokenOf(formData: FormData): string | undefined {
  const value = formData.get("captchaToken");
  if (typeof value !== "string" || value === "" || value.length > MAX_CAPTCHA_TOKEN_LENGTH) return undefined;
  return value;
}

interface AuthFailure {
  status?: number;
  code?: string;
}

function isRateLimited(error: AuthFailure): boolean {
  return error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit";
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") ?? "" });
  if (!parsed.success) return { email, error: authErrorCode(parsed.error.issues[0]?.message) };

  const supabase = await createSupabaseServerClient();
  const captchaToken = captchaTokenOf(formData);
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    ...(captchaToken && { options: { captchaToken } }),
  });
  if (error) {
    if (error.code === "captcha_failed") return { email, error: "botCheck" };
    if (isRateLimited(error)) return { email, error: "tooManyRequests" };
    // A network or server failure is not a wrong password: do not blame the credentials.
    const rejected = error.status !== undefined && error.status >= 400 && error.status < 500;
    return { email, error: rejected ? "invalidCredentials" : "generic" };
  }
  redirect("/");
}

export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = signUpSchema.safeParse({ email, password: formData.get("password") ?? "" });
  if (!parsed.success) return { email, error: authErrorCode(parsed.error.issues[0]?.message) };

  const supabase = await createSupabaseServerClient();
  const origin = await requestOrigin();
  const captchaToken = captchaTokenOf(formData);
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm`, ...(captchaToken && { captchaToken }) },
  });
  if (error) {
    if (error.code === "captcha_failed") return { email, error: "botCheck" };
    if (isRateLimited(error)) return { email, error: "tooManyRequests" };
    if (error.code === "user_already_exists" || error.code === "email_exists") return { email, error: "emailTaken" };
    if (error.code === "weak_password") return { email, error: "passwordWeak" };
    return { email, error: "generic" };
  }
  // With e-mail confirmation on there is no session yet: the link in the e-mail finishes the job.
  if (!data.session) return { email, notice: "checkEmail" };
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3200";
  const local = host.startsWith("localhost") || host.startsWith("127.");
  const protocol = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${protocol}://${host}`;
}

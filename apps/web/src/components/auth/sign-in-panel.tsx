"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState, useTransition } from "react";
import { signIn, type AuthFormState } from "@/app/actions/auth";
import { Button, buttonClass } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/schemas";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { TurnstileWidget } from "./turnstile-widget";

/**
 * The sign-in screen: the password form (a Server Action) and « try without an account » (an
 * anonymous sign-in from the browser, so that Supabase's per-IP limit sees the visitor's address).
 * They share one CAPTCHA widget, shown only when a Turnstile site key is configured.
 */
export function SignInPanel({
  supabaseUrl,
  supabaseKey,
  turnstileSiteKey,
  linkNotice,
}: {
  supabaseUrl: string;
  supabaseKey: string;
  turnstileSiteKey?: string;
  /** Result of an e-mailed link that ended here (see /auth/confirm). */
  linkNotice?: "invalid" | "confirmed";
}) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // A new object after each attempt (form or guest): the CAPTCHA token is single-use.
  const [guestAttempt, setGuestAttempt] = useState({});
  const captchaResetKey = useMemo(() => ({}), [state, guestAttempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [guestError, setGuestError] = useState<"botCheck" | "tooManyRequests" | "guestUnavailable">();
  const [guestPending, setGuestPending] = useState(false);
  const [navigating, startNavigation] = useTransition();

  const waitingForCaptcha = Boolean(turnstileSiteKey) && !captchaToken;
  const emailError = state.error === "emailRequired" || state.error === "emailInvalid" ? state.error : undefined;
  const formError = emailError ? undefined : state.error;

  async function tryWithoutAccount() {
    if (waitingForCaptcha) {
      setGuestError("botCheck");
      return;
    }
    setGuestPending(true);
    setGuestError(undefined);
    const supabase = createSupabaseBrowserClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
    setGuestPending(false);
    if (error) {
      setGuestError(
        error.code === "captcha_failed"
          ? "botCheck"
          : error.status === 429 || error.code === "over_request_rate_limit"
            ? "tooManyRequests"
            : "guestUnavailable",
      );
      // A Turnstile token is single-use: ask for a new one.
      setGuestAttempt({});
      return;
    }
    // The session cookies are set: the server sees the guest on the next request.
    startNavigation(() => router.push("/welcome"));
  }

  return (
    <div className="space-y-8">
      <form action={formAction} noValidate className="space-y-5">
        {linkNotice === "invalid" && <FormMessage kind="error">{te("linkExpired")}</FormMessage>}
        {linkNotice === "confirmed" && <FormMessage kind="notice">{t("signUp.confirmed")}</FormMessage>}
        <TextField
          label={t("signIn.email")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          // React resets a form after its action: a new key re-applies the e-mail the visitor typed.
          key={state.email ?? ""}
          defaultValue={state.email}
          error={emailError ? te(emailError) : undefined}
          required
        />
        <TextField
          label={t("signIn.password")}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {turnstileSiteKey && (
          <TurnstileWidget siteKey={turnstileSiteKey} onToken={setCaptchaToken} fieldName="captchaToken" resetKey={captchaResetKey} />
        )}
        {formError && <FormMessage kind="error">{te(formError, { min: PASSWORD_MIN_LENGTH })}</FormMessage>}
        <Button type="submit" disabled={pending || waitingForCaptcha}>
          {pending ? t("signIn.submitting") : t("signIn.submit")}
        </Button>
      </form>

      <div className="space-y-2 text-center">
        <p className="text-sm text-muted">{t("signIn.noAccount")}</p>
        <Link href="/sign-up" className={buttonClass("secondary")}>
          {t("signIn.createAccountLink")}
        </Link>
        <Button variant="ghost" onClick={tryWithoutAccount} disabled={guestPending || navigating}>
          {t("guest.trial")}
        </Button>
        {guestError && <FormMessage kind="error">{te(guestError)}</FormMessage>}
      </div>
    </div>
  );
}

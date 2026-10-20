"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { Feedback, SubmitButton } from "./auth-fields";
import { guestSignInErrorMessage } from "./guest-sign-in-error";
import { TurnstileWidget } from "./turnstile-widget";

/**
 * « Essayer sans compte »: opens an anonymous session, then the first-run screen.
 * The sign-in runs in the browser so that the per-IP limit of Supabase (`anonymous_users`) sees
 * the visitor's address, not the server's. With a Turnstile site key, a CAPTCHA token is required
 * (Supabase checks it when CAPTCHA protection is on).
 */
export function GuestTrialForm({
  supabaseUrl,
  supabaseKey,
  turnstileSiteKey,
}: {
  supabaseUrl: string;
  supabaseKey: string;
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (turnstileSiteKey && !captchaToken) {
      setError("Termine d’abord la vérification anti-robot.");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey);
    const { error: signInError } = await supabase.auth.signInAnonymously(
      captchaToken ? { options: { captchaToken } } : undefined,
    );
    setSubmitting(false);
    if (signInError) {
      if (!(signInError.status === 429 || signInError.code === "captcha_failed")) {
        console.error("signInAnonymously failed", signInError);
      }
      setError(guestSignInErrorMessage(signInError));
      // A Turnstile token is single-use: ask for a new one.
      setCaptchaReset((n) => n + 1);
      return;
    }
    // The session cookies are set: the server sees the guest on the next request.
    startNavigation(() => router.push("/bienvenue"));
  }

  const waitingForCaptcha = Boolean(turnstileSiteKey) && !captchaToken;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} onToken={setCaptchaToken} resetKey={captchaReset} />}
      <Feedback state={{ error }} />
      <SubmitButton
        pending={submitting || navigating || waitingForCaptcha}
        label="Essayer sans compte"
      />
    </form>
  );
}

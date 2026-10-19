"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { Feedback, SubmitButton } from "./auth-fields";
import { guestSignInErrorMessage } from "./guest-sign-in-error";

/** Cloudflare Turnstile, explicit rendering (https://developers.cloudflare.com/turnstile/). */
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      size?: "normal" | "flexible" | "compact";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

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
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  function renderCaptcha() {
    if (!turnstileSiteKey || !window.turnstile || !captchaRef.current || widgetRef.current) return;
    widgetRef.current = window.turnstile.render(captchaRef.current, {
      sitekey: turnstileSiteKey,
      language: "fr",
      size: "flexible",
      callback: setCaptchaToken,
      "expired-callback": () => setCaptchaToken(null),
      "error-callback": () => setCaptchaToken(null),
    });
  }

  useEffect(
    () => () => {
      if (widgetRef.current) window.turnstile?.remove(widgetRef.current);
      widgetRef.current = null;
    },
    [],
  );

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
      if (widgetRef.current) window.turnstile?.reset(widgetRef.current);
      setCaptchaToken(null);
      return;
    }
    // The session cookies are set: the server sees the guest on the next request.
    startNavigation(() => router.push("/bienvenue"));
  }

  const waitingForCaptcha = Boolean(turnstileSiteKey) && !captchaToken;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {turnstileSiteKey && (
        <>
          <Script
            src={TURNSTILE_SCRIPT}
            onReady={renderCaptcha}
            onError={() => setError("La vérification anti-robot n’a pas pu se charger. Recharge la page.")}
          />
          <div ref={captchaRef} className="min-h-[65px]" />
        </>
      )}
      <Feedback state={{ error }} />
      <SubmitButton
        pending={submitting || navigating || waitingForCaptcha}
        label="Essayer sans compte"
      />
    </form>
  );
}

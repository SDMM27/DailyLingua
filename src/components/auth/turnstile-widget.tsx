"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

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
 * Cloudflare Turnstile challenge. The token is handed to `onToken` (null while there is none: not
 * solved yet, expired or failed) and, with `fieldName`, also written in a hidden input so that a
 * FormData form posts it. A token is single-use: change `resetKey` (e.g. the state returned by a
 * form action) after each submission to ask for a new one.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  fieldName,
  resetKey,
}: {
  siteKey: string;
  onToken?: (token: string | null) => void;
  fieldName?: string;
  resetKey?: unknown;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const firstResetKey = useRef(resetKey);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  function update(next: string | null) {
    setToken(next);
    onTokenRef.current?.(next);
  }

  function render() {
    if (!window.turnstile || !containerRef.current || widgetRef.current) return;
    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      language: "fr",
      size: "flexible",
      callback: update,
      "expired-callback": () => update(null),
      "error-callback": () => update(null),
    });
  }

  useEffect(() => {
    if (Object.is(firstResetKey.current, resetKey)) return;
    firstResetKey.current = resetKey;
    if (widgetRef.current) window.turnstile?.reset(widgetRef.current);
    update(null);
  }, [resetKey]);

  useEffect(
    () => () => {
      if (widgetRef.current) window.turnstile?.remove(widgetRef.current);
      widgetRef.current = null;
    },
    [],
  );

  return (
    <>
      <Script src={TURNSTILE_SCRIPT} onReady={render} onError={() => setLoadFailed(true)} />
      <div ref={containerRef} className="min-h-[65px]" />
      {fieldName && <input type="hidden" name={fieldName} value={token ?? ""} />}
      {loadFailed && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          La vérification anti-robot n’a pas pu se charger. Recharge la page.
        </p>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { prepareTodayMission } from "@/app/actions/mission";
import { TrialOverCard } from "@/components/auth/trial-over-card";
import { RestDayCard } from "@/components/mission/rest-day-card";
import { Card, Eyebrow } from "@/components/ui/primitives";

/** Another request is writing the mission: ask again after this delay, at most this many times. */
const POLL_DELAY_MS = 4000;
const MAX_POLLS = 15;

type State =
  | { kind: "working" }
  | { kind: "failed"; message: string }
  | { kind: "no-content" }
  | { kind: "rest-day" }
  | { kind: "signup-required" };

const BUTTON =
  "mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-paper";

/**
 * Shown instead of the mission while there is none: asks the server to write it (the call can
 * take several seconds), then reloads the page. The server is idempotent, so asking again is safe.
 */
export function MissionPreparing() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "working" });
  const started = useRef(false);
  const cancelled = useRef(false);

  const run = useCallback(async () => {
    setState({ kind: "working" });
    for (let poll = 0; poll <= MAX_POLLS; poll++) {
      const result = await prepareTodayMission({});
      if (cancelled.current) return;
      if (!result.ok) return setState({ kind: "failed", message: result.error });
      switch (result.data.status) {
        case "ready":
          // The action already refreshed the page; this is only a safety net.
          return router.refresh();
        case "failed":
          return setState({ kind: "failed", message: "La mission n’a pas pu être préparée." });
        case "no-content":
          return setState({ kind: "no-content" });
        case "rest-day":
          return setState({ kind: "rest-day" });
        case "signup-required":
          return setState({ kind: "signup-required" });
        case "pending":
          await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
          if (cancelled.current) return;
      }
    }
    setState({ kind: "failed", message: "La mission n’a pas pu être préparée." });
  }, [router]);

  useEffect(() => {
    cancelled.current = false;
    // Effects run twice in development (StrictMode): ask the server only once.
    if (!started.current) {
      started.current = true;
      void run();
    }
    return () => {
      cancelled.current = true;
    };
  }, [run]);

  if (state.kind === "signup-required") return <TrialOverCard />;
  if (state.kind === "rest-day") return <RestDayCard homeLink />;

  return (
    <Card>
      <Eyebrow>Mission du jour</Eyebrow>
      <div role="status" aria-live="polite">
        {state.kind === "working" && (
          <>
            <p className="mt-2 font-serif text-lg">Préparation de ta mission…</p>
            <p className="mt-2 text-sm text-ink-soft">
              On choisit un contenu récent dans chacune de tes langues et on rédige les exercices. Ça prend
              quelques secondes.
            </p>
          </>
        )}
        {state.kind === "failed" && <p className="mt-2 font-serif text-lg">{state.message}</p>}
        {state.kind === "no-content" && (
          <p className="mt-2 font-serif text-lg">
            Pas encore de contenu récent dans tes langues. Reviens un peu plus tard.
          </p>
        )}
      </div>
      {state.kind === "failed" && (
        <button type="button" className={BUTTON} onClick={() => void run()}>
          Réessayer
        </button>
      )}
      {state.kind === "no-content" && (
        <Link href="/lire" className={BUTTON}>
          Voir les lectures
        </Link>
      )}
    </Card>
  );
}

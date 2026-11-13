"use client";

import { useState } from "react";
import { reportNoAccess } from "@/app/actions/mission";
import { buttonClass } from "@/components/ui/primitives";

type Step = "idle" | "confirm" | "pending" | "no-content" | "limit";

const MESSAGES = {
  "no-content": "Aucun autre contenu lisible pour cette langue aujourd’hui.",
  limit: "Tu as déjà remplacé 3 contenus aujourd’hui.",
} as const;

/**
 * « Je n’ai pas accès à ce contenu »: the learner cannot read it (paywall, region...). Asks for a
 * confirmation, since the progress on that language is erased, then has the server swap the
 * content. On success the action refreshes the page and this session is replaced by a new one.
 */
export function NoAccessButton({ sessionId }: { sessionId: string }) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  async function replace() {
    setStep("pending");
    setError(null);
    const outcome = await reportNoAccess({ sessionId });
    if (!outcome.ok) {
      setError(outcome.error);
      setStep("idle");
      return;
    }
    // "ready": the page is re-rendered with the new session; keep the pending state until then.
    setStep(outcome.data.status === "ready" ? "pending" : outcome.data.status);
  }

  return (
    <div className="mt-2">
      {step === "idle" && (
        <button
          type="button"
          onClick={() => setStep("confirm")}
          className="min-h-11 rounded-full px-1 text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Je n’ai pas accès à ce contenu
        </button>
      )}

      {step === "confirm" && (
        <div className="max-w-[68ch] space-y-2 border-y border-line py-3">
          <p className="text-sm leading-relaxed text-ink-soft">
            Remplacer ce contenu ? Ta progression sur cette langue aujourd’hui sera effacée.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={replace}
              className={`${buttonClass.secondary} px-4 text-sm`}
            >
              Remplacer
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {step === "pending" && (
        <p role="status" className="min-h-11 py-3 text-sm text-ink-soft">
          Recherche d’un autre contenu…
        </p>
      )}

      {(step === "no-content" || step === "limit") && (
        <p role="status" className="border-y border-line py-3 text-sm text-ink-soft">
          {MESSAGES[step]}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

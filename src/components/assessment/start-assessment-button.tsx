"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startAssessment } from "@/app/actions/assessment";
import { ArrowRightIcon } from "@/components/icons";
import type { Language } from "@/lib/schemas/common";

/**
 * Starts (or resumes) the assessment of a language, then reloads the page, which shows it. The
 * server chooses the dossier; `higher` asks for the level above, which it checks. The button is
 * only drawn for a language and a level that have a visible dossier (see the page).
 */
export function StartAssessmentButton({
  language,
  higher = false,
  children,
  variant = "primary",
}: {
  language: Language;
  higher?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const result = await startAssessment({ language, higher });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    // Stay busy while the page reloads.
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={
          variant === "primary"
            ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-paper disabled:opacity-60"
            : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-ink hover:bg-surface-sunk disabled:opacity-60"
        }
      >
        {busy ? "Préparation…" : children}
        {!busy && <ArrowRightIcon width={14} height={14} />}
      </button>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

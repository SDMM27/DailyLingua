"use client";

import { useState } from "react";
import { addCorrectionCard } from "@/app/actions/correction-cards";
import { CheckIcon, PlusIcon } from "@/components/icons";

/** Keeps one correction as a review card ("Mes erreurs à revoir"). */
export function AddCorrectionCardButton({
  sessionId,
  correctionIndex,
  added: initiallyAdded,
}: {
  sessionId: string;
  correctionIndex: number;
  added: boolean;
}) {
  const [added, setAdded] = useState(initiallyAdded);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (added) {
    return (
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckIcon width={13} height={13} />
        Ajoutée aux erreurs à revoir
      </p>
    );
  }

  const add = async () => {
    setPending(true);
    const result = await addCorrectionCard({ sessionId, correctionIndex });
    setPending(false);
    if (result.ok) {
      setAdded(true);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={add}
        disabled={pending}
        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-sunk disabled:opacity-60"
      >
        <PlusIcon width={13} height={13} />À réviser
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

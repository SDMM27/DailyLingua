"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { skipPlacementTest } from "@/app/actions/placement";
import { buttonClass } from "@/components/ui/primitives";
import type { Language } from "@/lib/schemas/common";

/** Records that the learner passes on the placement test of a language (level unchanged). */
export function SkipPlacementButton({ language, persist }: { language: Language; persist: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function skip() {
    setPending(true);
    setError(null);
    const outcome = await skipPlacementTest({ language });
    setPending(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    router.refresh();
  }

  // In the demo nothing can be saved: the server action would refuse anyway.
  if (!persist) return null;
  return (
    <>
      <button
        type="button"
        onClick={skip}
        disabled={pending}
        className={buttonClass.quiet}
      >
        {pending ? "Enregistrement…" : "Plus tard"}
      </button>
      {error && (
        <p role="alert" className="basis-full rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

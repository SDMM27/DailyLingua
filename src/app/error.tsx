"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass, Eyebrow } from "@/components/ui/primitives";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border-t border-ink py-12 md:py-20">
      <Eyebrow>Erreur</Eyebrow>
      <h1 className="sd-display mt-3 text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] text-balance">
        Quelque chose s’est mal passé
      </h1>
      <p className="mt-4 max-w-[68ch] font-serif text-lg leading-relaxed text-ink-soft">
        La page n’a pas pu se charger. Réessaie dans un instant.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={reset} className={buttonClass.primary}>
          Réessayer
        </button>
        <Link href="/retour" className={buttonClass.quiet}>
          Envoyer un retour
        </Link>
      </div>
    </div>
  );
}

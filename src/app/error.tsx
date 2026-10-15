"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Erreur</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Quelque chose s’est mal passé</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
        La page n’a pas pu se charger. Réessaie dans un instant.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-2xl bg-ink px-6 py-3 font-semibold text-paper"
      >
        Réessayer
      </button>
      <p className="mt-5 text-sm">
        <Link href="/retour" className="text-ink-soft underline">
          Envoyer un retour
        </Link>
      </p>
    </div>
  );
}

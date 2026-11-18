"use client";

import { useState } from "react";
import { LanguageTag } from "@/components/ui/primitives";

/** Illustrative excerpt (not a real source): words are highlighted, a tap shows their translation. */
const WORDS = [
  { text: "si fermano", gloss: "s’arrêtent" },
  { text: "bancone", gloss: "le comptoir" },
  { text: "più lenta", gloss: "plus lente" },
  { text: "da asporto", gloss: "à emporter" },
] as const;

const markClass =
  "sd-mark cursor-pointer rounded-sm px-0.5 py-1 [--sd-mark:var(--marker)] aria-pressed:outline-2 aria-pressed:outline-accent";

export function SampleArticle() {
  const [picked, setPicked] = useState(1);
  const word = (i: number) => {
    const w = WORDS[i];
    return (
      <button
        type="button"
        className={markClass}
        style={{ animationDelay: `${0.3 + i * 0.4}s` }}
        aria-pressed={picked === i}
        onClick={() => setPicked(i)}
      >
        {w.text}
      </button>
    );
  };

  return (
    <article aria-label="Exemple d’article du jour" className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2 text-muted">
        <LanguageTag language="it" />
        <span className="kicker">B2 · Podcast · Il Post · 10 min</span>
      </div>
      <h2 lang="it" className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] font-bold">
        La pausa caffè, un rito che cambia
      </h2>
      <p lang="it" className="font-serif text-xl leading-[1.7]">
        Ogni mattina, milioni di italiani {word(0)} al {word(1)} per un caffè veloce. Ma la pausa sta cambiando: più
        lunga, {word(2)}, a volte {word(3)}.
      </p>
      <div
        aria-live="polite"
        className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-lg border border-line bg-surface px-4 py-3.5"
      >
        <span lang="it" className="font-serif text-xl font-bold italic">
          {WORDS[picked].text}
        </span>
        <span aria-hidden="true" className="text-muted">
          →
        </span>
        <span className="text-base font-semibold">{WORDS[picked].gloss}</span>
        <span className="kicker ml-auto text-accent-strong">+ ajouté aux révisions</span>
      </div>
      <p className="kicker text-muted">Touche un mot surligné pour sa traduction · extrait d’exemple</p>
    </article>
  );
}

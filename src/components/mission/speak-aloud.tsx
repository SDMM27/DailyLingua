"use client";

import { ListenButton, PILL_BUTTON_CLASS } from "@/components/ui/listen-button";
import type { Language } from "@/lib/schemas/common";

/**
 * The speaking part of a `spoken` production, nothing is recorded: read the native version
 * aloud, hide it and say the text again from memory, then answer the task again without looking.
 * Without a native version (no correction), the steps are about the learner's own text.
 */
export function SpeakAloud({
  language,
  nativeVersion,
  ownText,
  hidden,
  onToggleHidden,
}: {
  language: Language;
  /** The corrected text to read; absent when there is no correction. */
  nativeVersion?: string;
  ownText: string;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const own = !nativeVersion;
  return (
    <section aria-label="À voix haute" className="mt-5 rounded-2xl border border-line px-4 py-4">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">À voix haute</p>
      <ol className="mt-3 space-y-4">
        <li className="text-[13px] leading-relaxed text-ink-soft">
          <span className="block">
            1. {own ? "Lis ton texte" : "Lis la version du natif"} à voix haute, deux fois.
          </span>
          {nativeVersion && (
            <span className="mt-2 flex">
              <ListenButton text={nativeVersion} language={language} />
            </span>
          )}
        </li>
        <li className="text-[13px] leading-relaxed text-ink-soft">
          <span className="block">
            2. Masque-{own ? "le" : "la"} et redis ton texte de mémoire
            {own ? "" : ", en reprenant les corrections"}.
          </span>
          <button type="button" onClick={onToggleHidden} aria-pressed={hidden} className={`${PILL_BUTTON_CLASS} mt-2`}>
            {hidden ? "Afficher" : "Masquer"}
          </button>
        </li>
        <li className="text-[13px] leading-relaxed text-ink-soft">
          3. Réponds de nouveau à la consigne à voix haute, sans rien regarder.
        </li>
      </ol>
      {own && !hidden && (
        <p lang={language} className="mt-4 font-serif leading-relaxed whitespace-pre-wrap">
          {ownText}
        </p>
      )}
    </section>
  );
}

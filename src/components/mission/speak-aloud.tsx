"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";
import { findLocalVoice } from "./speech-voices";

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk";

function synthesis(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

/**
 * Whether the device has a voice of its own for `language`. Voices load asynchronously on most
 * browsers (`voiceschanged`); on the server there is none, so the button is not rendered.
 */
function localVoice(synth: SpeechSynthesis, language: Language): SpeechSynthesisVoice | null {
  return findLocalVoice(synth.getVoices(), language, languageInfo(language).speechRegions);
}

function useHasLocalVoice(language: Language): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const synth = synthesis();
    synth?.addEventListener("voiceschanged", onChange);
    return () => synth?.removeEventListener("voiceschanged", onChange);
  }, []);
  const getSnapshot = useCallback(() => {
    const synth = synthesis();
    return synth ? localVoice(synth, language) !== null : false;
  }, [language]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Reads `text` with the device's own voice; renders nothing when there is none (nothing is sent to a third party). */
function ListenButton({ text, language }: { text: string; language: Language }) {
  const available = useHasLocalVoice(language);
  const [playing, setPlaying] = useState(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    current.current = null;
    synthesis()?.cancel();
    setPlaying(false);
  }, []);

  // A different text, or leaving the screen, must not leave a voice talking.
  useEffect(() => stop, [text, stop]);

  if (!available) return null;

  function toggle() {
    const synth = synthesis();
    if (!synth) return;
    if (playing) {
      stop();
      return;
    }
    const voice = localVoice(synth, language);
    if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    const done = () => {
      // Ignore the end of an utterance that was stopped and replaced.
      if (current.current === utterance) stop();
    };
    utterance.onend = done;
    utterance.onerror = done;
    current.current = utterance;
    setPlaying(true);
    synth.speak(utterance);
  }

  return (
    <button type="button" onClick={toggle} className={BUTTON_CLASS}>
      {playing ? "Arrêter" : "Écouter"}
    </button>
  );
}

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
          <button type="button" onClick={onToggleHidden} aria-pressed={hidden} className={`${BUTTON_CLASS} mt-2`}>
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

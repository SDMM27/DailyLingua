"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { findLocalVoice } from "@/components/mission/speech-voices";
import { languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";

export const PILL_BUTTON_CLASS =
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

export function useHasLocalVoice(language: Language): boolean {
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
export function ListenButton({ text, language }: { text: string; language: Language }) {
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
    <button type="button" onClick={toggle} className={PILL_BUTTON_CLASS}>
      {playing ? "Arrêter" : "Écouter"}
    </button>
  );
}

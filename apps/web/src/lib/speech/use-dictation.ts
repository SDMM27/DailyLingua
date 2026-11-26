"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRecognizer, type RecognitionError, type Recognizer } from "./recognizer";
import { useSpeechSupported } from "./use-recognition";

/** The dictation stops by itself here (`j5-pr2-production-orale.md` §1). */
export const DICTATION_MAX_MS = 120_000;
/** The mark shown on the timer: what the learner is asked for. */
export const DICTATION_TARGET_MS = 60_000;

export type DictationStatus = "idle" | "listening" | "stopped" | "unavailable";

export interface DictationState {
  status: DictationStatus;
  /** What was understood so far: the text of the earlier stretches, then the one being heard. */
  transcript: string;
  /** Time spent speaking, the stretches added up (a stop and a resume do not count the pause). */
  elapsedMs: number;
  /** Why the last stretch gave nothing; `denied` means the learner can only write. */
  error: RecognitionError | null;
  /** The two minutes were reached: the listening stopped by itself. */
  reachedMax: boolean;
}

const join = (before: string, next: string) => [before, next].filter(Boolean).join(" ");

/**
 * Continuous recognition of a few sentences in `language`, for the « Dire » mode of the expression step. `start()` (from
 * a tap) listens, `stop()` keeps the text, `start()` again adds to it, `clear()` drops everything. It never records or
 * keeps audio, and stops by itself at `DICTATION_MAX_MS` of speaking.
 */
export function useDictation(language: string) {
  const supported = useSpeechSupported();
  const [state, setState] = useState<DictationState>({ status: "idle", transcript: "", elapsedMs: 0, error: null, reachedMax: false });
  const recognizer = useRef<Recognizer | null>(null);
  /** What the finished stretches gave, and the time they took. */
  const kept = useRef({ text: "", ms: 0 });
  const heard = useRef("");
  const stretchStart = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const stopClock = useCallback(() => {
    window.clearInterval(timer.current);
    timer.current = undefined;
  }, []);

  const discard = useCallback(() => {
    stopClock();
    const current = recognizer.current;
    recognizer.current = null;
    if (current) {
      current.onPartial = current.onFinal = current.onError = null;
      current.abort();
    }
  }, [stopClock]);

  useEffect(() => discard, [discard]);

  /** Closes the stretch being heard: its text and its time join the kept ones. */
  const settle = useCallback((text: string, error: RecognitionError | null) => {
    stopClock();
    recognizer.current = null;
    const ms = Math.min(DICTATION_MAX_MS, kept.current.ms + Math.max(0, Date.now() - stretchStart.current));
    kept.current = { text: join(kept.current.text, text), ms };
    heard.current = "";
    setState((previous) => ({
      status: kept.current.text ? "stopped" : "idle",
      transcript: kept.current.text,
      elapsedMs: ms,
      error: error === "no-speech" && kept.current.text ? null : error,
      reachedMax: previous.reachedMax,
    }));
  }, [stopClock]);

  const start = useCallback(() => {
    discard();
    if (kept.current.ms >= DICTATION_MAX_MS) return;
    const next = createRecognizer(language, { continuous: true });
    if (!next) {
      setState((previous) => ({ ...previous, status: "unavailable" }));
      return;
    }
    recognizer.current = next;
    heard.current = "";
    stretchStart.current = Date.now();
    next.onPartial = (text) => {
      heard.current = text;
      setState((previous) => ({ ...previous, status: "listening", transcript: join(kept.current.text, text), error: null }));
    };
    next.onFinal = (text) => settle(text, null);
    next.onError = (error) => settle("", error);
    setState((previous) => ({ ...previous, status: "listening", error: null, reachedMax: false }));
    next.start();
    timer.current = window.setInterval(() => {
      const elapsed = kept.current.ms + Date.now() - stretchStart.current;
      setState((previous) => ({ ...previous, elapsedMs: Math.min(DICTATION_MAX_MS, elapsed) }));
      if (elapsed >= DICTATION_MAX_MS) {
        // Stopping delivers the text through `onFinal`; the flag tells the screen why it stopped.
        setState((previous) => ({ ...previous, reachedMax: true }));
        stopClock();
        recognizer.current?.stop();
      }
    }, 250);
  }, [discard, language, settle, stopClock]);

  const stop = useCallback(() => recognizer.current?.stop(), []);

  /** What is on screen right now, the stretch being heard included (nothing is lost on a switch to the keyboard). */
  const snapshot = useCallback(() => join(kept.current.text, heard.current), []);

  const clear = useCallback(() => {
    discard();
    kept.current = { text: "", ms: 0 };
    heard.current = "";
    setState({ status: "idle", transcript: "", elapsedMs: 0, error: null, reachedMax: false });
  }, [discard]);

  return { ...state, status: supported ? state.status : ("unavailable" as const), start, stop, clear, snapshot };
}

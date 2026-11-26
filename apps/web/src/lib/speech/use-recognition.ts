"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRecognizer, speechRecognitionSupported, type RecognitionError, type Recognizer } from "./recognizer";

/** `unavailable`: this browser cannot recognise speech. `error`: see `error`; `denied` and `failed` mean the self-rating fallback. */
export type RecognitionStatus = "idle" | "listening" | "done" | "error" | "unavailable";

export interface RecognitionState {
  status: RecognitionStatus;
  /** What was understood: partial while listening, the sentence once done. */
  transcript: string;
  error: RecognitionError | null;
}

const IDLE: RecognitionState = { status: "idle", transcript: "", error: null };
const UNAVAILABLE: RecognitionState = { status: "unavailable", transcript: "", error: null };

/** Called as the recognition ends, besides the state: the screen that reacts (a comparison, an event) does it here, not in an effect. */
export interface RecognitionHandlers {
  onFinal?(text: string): void;
  onError?(error: RecognitionError): void;
}

const subscribeNothing = () => () => undefined;

/** Whether this browser can recognise speech (the server render assumes it can: the screens that ask are client ones). */
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(subscribeNothing, speechRecognitionSupported, () => true);
}

/**
 * Listens for one sentence at a time in `language`. `start()` must run from a tap. The state returns to `idle` with
 * `reset()`. Where the browser cannot recognise speech the status is `unavailable` from the first client render on
 * (the server render assumes it can: the workshop is a client screen).
 */
export function useRecognition(language: string, handlers: RecognitionHandlers = {}) {
  const supported = useSpeechSupported();
  const [state, setState] = useState<RecognitionState>(IDLE);
  const recognizer = useRef<Recognizer | null>(null);
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  const discard = useCallback(() => {
    const current = recognizer.current;
    recognizer.current = null;
    if (current) {
      current.onPartial = current.onFinal = current.onError = null;
      current.abort();
    }
  }, []);

  useEffect(() => discard, [discard]);

  const start = useCallback(() => {
    discard();
    const next = createRecognizer(language);
    if (!next) {
      setState(UNAVAILABLE);
      return;
    }
    recognizer.current = next;
    next.onPartial = (text) => setState({ status: "listening", transcript: text, error: null });
    next.onFinal = (text) => {
      setState({ status: "done", transcript: text, error: null });
      latest.current.onFinal?.(text);
    };
    next.onError = (error) => {
      setState({ status: "error", transcript: "", error });
      latest.current.onError?.(error);
    };
    setState({ status: "listening", transcript: "", error: null });
    next.start();
  }, [discard, language]);

  const stop = useCallback(() => recognizer.current?.stop(), []);
  const reset = useCallback(() => {
    discard();
    setState(IDLE);
  }, [discard]);

  return { ...(supported ? state : UNAVAILABLE), start, stop, reset };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** `unavailable`: the file failed to load or play (offline without cache). A null path is not a failure: the audio is not made yet. */
export type ClipState = "idle" | "playing" | "unavailable";

/**
 * Plays one audio file at a time. The element is created on the first play, so nothing is fetched before the learner asks
 * (the files may not exist yet). `onEnded` runs when the clip ends by itself.
 */
export function useClip() {
  const element = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<ClipState>("idle");
  const [path, setPath] = useState<string | null>(null);

  const stop = useCallback(() => {
    const audio = element.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    setState((current) => (current === "unavailable" ? current : "idle"));
    setPath(null);
  }, []);

  const play = useCallback((source: string, options: { rate?: number; onEnded?: () => void } = {}) => {
    const audio = (element.current ??= new Audio());
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = source;
    audio.playbackRate = options.rate ?? 1;
    audio.onended = () => {
      setState("idle");
      setPath(null);
      options.onEnded?.();
    };
    audio.onerror = () => {
      setState("unavailable");
      setPath(null);
    };
    setPath(source);
    setState("playing");
    void Promise.resolve(audio.play()).catch(() => {
      setState("unavailable");
      setPath(null);
    });
  }, []);

  useEffect(() => () => {
    const audio = element.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
  }, []);

  return { state, path, play, stop };
}

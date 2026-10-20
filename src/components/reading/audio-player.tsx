"use client";

import { useRef, useState } from "react";
import { HeadphonesIcon } from "@/components/icons";

const SPEEDS = [
  { rate: 0.75, label: "0,75×" },
  { rate: 1, label: "1×" },
  { rate: 1.25, label: "1,25×" },
] as const;

/**
 * Podcast episode played from the publisher's own file (RSS enclosure), loaded on demand. Until the
 * learner taps « Écouter ici » nothing is requested (no `<audio>` element, so no preload either).
 * Afterwards the native player starts at once: it keeps playing in the background and on the lock
 * screen on iPhone.
 */
export function AudioPlayer({ audioUrl, title }: { audioUrl: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  if (!open) {
    const host = new URL(audioUrl).hostname.replace(/^www\./, "");
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ink px-4 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper"
        >
          <HeadphonesIcon width={16} height={16} />
          Écouter ici
        </button>
        <span className="text-xs text-muted">Lu depuis {host}</span>
      </div>
    );
  }

  function changeRate(next: number) {
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  }

  return (
    <div className="mt-3">
      <audio
        ref={audio}
        controls
        autoPlay
        preload="metadata"
        src={audioUrl}
        aria-label={title}
        onError={() => setFailed(true)}
        className="w-full"
      />
      <div role="group" aria-label="Vitesse de lecture" className="mt-2 flex items-center gap-1.5">
        {SPEEDS.map((speed) => (
          <button
            key={speed.rate}
            type="button"
            aria-pressed={rate === speed.rate}
            onClick={() => changeRate(speed.rate)}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-line px-3 text-xs font-semibold transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
          >
            {speed.label}
          </button>
        ))}
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Lecture impossible ici : ouvre l’épisode chez l’éditeur.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { PlayIcon } from "@/components/icons";
import { youtubeEmbedUrl } from "@/lib/content/youtube";
import type { Language } from "@/lib/schemas/common";

/**
 * Official YouTube player, loaded on demand. Until the learner taps play nothing is requested from
 * Google (no thumbnail, no iframe): the facade is plain markup. Afterwards the privacy-enhanced
 * player (youtube-nocookie.com) starts at once, with subtitles proposed in the studied language.
 */
export function YouTubePlayer({
  videoId,
  title,
  language,
  startPlaying = false,
}: {
  videoId: string;
  title: string;
  language: Language;
  /** The learner already asked to watch (e.g. « Regarder ici »): skip the facade. */
  startPlaying?: boolean;
}) {
  const [playing, setPlaying] = useState(startPlaying);

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink">
        <iframe
          src={youtubeEmbedUrl(videoId, language)}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Lire la vidéo : ${title}`}
      className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-ink px-5 text-center text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-paper text-ink">
        <PlayIcon width={28} height={28} />
      </span>
      <span lang={language} className="line-clamp-2 text-sm leading-snug font-semibold text-balance">
        {title}
      </span>
      <span className="text-xs opacity-70">Lue depuis YouTube</span>
    </button>
  );
}

"use client";

import { useState } from "react";
import { PlayIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/primitives";
import type { Language } from "@/lib/schemas/common";
import { YouTubePlayer } from "./youtube-player";

/** « Regarder ici » button of a reading-list video: reveals the player under the item and starts it (the tap is the consent to load YouTube). */
export function WatchHere({ videoId, title, language }: { videoId: string; title: string; language: Language }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      {open ? (
        <YouTubePlayer videoId={videoId} title={title} language={language} startPlaying />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonClass.secondary}
        >
          <PlayIcon width={16} height={16} />
          Regarder ici
        </button>
      )}
    </div>
  );
}

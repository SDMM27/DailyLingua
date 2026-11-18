"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/primitives";
import { canStartListening, LISTENING_MAX_PLAYS } from "@/lib/domain/assessment";

type Status = "idle" | "playing" | "paused" | "error";

/**
 * Plays the recording of a listening test, at most `LISTENING_MAX_PLAYS` times: no scrubber, no speed,
 * no native controls. A listening counts when it starts from the beginning; pausing and resuming do
 * not count, and neither does a load error. It never receives the script.
 */
export function ListeningPlayer({
  src,
  title,
  initialPlays = 0,
  onPlaysChange,
}: {
  src: string;
  title: string;
  initialPlays?: number;
  onPlaysChange?: (plays: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [plays, setPlays] = useState(initialPlays);
  const [status, setStatus] = useState<Status>("idle");
  // Listening counted and not finished yet: the next press resumes instead of starting a new one.
  const [inProgress, setInProgress] = useState(false);
  const starting = useRef(false);
  const playsRef = useRef(initialPlays);

  // Leaving the screen must not leave a voice talking.
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  async function press() {
    const audio = audioRef.current;
    if (!audio || starting.current) return;
    if (status === "playing") {
      audio.pause();
      return;
    }
    const fresh = !inProgress;
    if (fresh && !canStartListening(playsRef.current)) return;
    starting.current = true;
    try {
      if (status === "error") audio.load();
      if (fresh) audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      // A pause or a new load interrupting the request is not a failure.
      if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("error");
      return;
    } finally {
      starting.current = false;
    }
    if (fresh) {
      setInProgress(true);
      playsRef.current += 1;
      setPlays(playsRef.current);
      onPlaysChange?.(playsRef.current);
    }
    setStatus("playing");
  }

  const exhausted = !canStartListening(plays) && !inProgress && status !== "playing";
  const label =
    status === "playing" ? "Pause" : status === "error" ? "Réessayer" : inProgress ? "Reprendre" : plays > 0 ? "Réécouter" : "Écouter";

  return (
    <div className="flex flex-col gap-3">
      <p className="kicker text-accent-strong">{title}</p>
      {/* No `controls`: the only way to play is the button below. */}
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPause={() => {
          if (audioRef.current && !audioRef.current.ended) setStatus("paused");
        }}
        onEnded={() => {
          setInProgress(false);
          setStatus("idle");
        }}
        onError={() => setStatus("error")}
      />
      <button
        type="button"
        onClick={press}
        disabled={exhausted}
        className={`${buttonClass.primary} self-start`}
      >
        {exhausted ? `Tu as utilisé tes ${LISTENING_MAX_PLAYS} écoutes` : label}
      </button>
      <p role="status" className="text-sm text-muted">
        {plays > 0 ? `Écoute ${plays} sur ${LISTENING_MAX_PLAYS}` : `${LISTENING_MAX_PLAYS} écoutes possibles`}
      </p>
      {status === "error" && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          L’enregistrement n’a pas pu être chargé. Vérifie ta connexion puis réessaie : cette tentative ne compte pas comme une écoute.
        </p>
      )}
    </div>
  );
}

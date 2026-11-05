"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "@/components/icons";
import { canStartListening, LISTENING_MAX_PLAYS } from "@/lib/domain/assessment";

/** The slice of the YouTube IFrame Player API this component uses. */
interface YTPlayer {
  loadVideoById(options: { videoId: string; startSeconds: number; endSeconds: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  unloadModule(name: string): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host: string;
      playerVars: Record<string, number>;
      events: { onReady: () => void; onStateChange: (event: { data: number }) => void; onError: () => void };
    },
  ) => YTPlayer;
}
type YTWindow = Window & { YT?: Partial<YTNamespace>; onYouTubeIframeAPIReady?: () => void };

const STATE_ENDED = 0;
const STATE_PLAYING = 1;
const STATE_PAUSED = 2;

const API_URL = "https://www.youtube.com/iframe_api";

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads the official IFrame API once, on demand. Only a pending load is shared, so a retry after a failure can succeed. */
function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT as YTNamespace);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (w.YT?.Player) resolve(w.YT as YTNamespace);
      else reject(new Error("YouTube API unavailable"));
    };
    const script = document.createElement("script");
    script.src = API_URL;
    script.async = true;
    script.onerror = () => reject(new Error("YouTube API failed to load"));
    document.head.appendChild(script);
  }).finally(() => {
    apiPromise = null;
  });
  return apiPromise;
}

/**
 * Where a listening stands: "idle" (none in progress), "starting" (asked, the passage has not played
 * yet: an advert or a load failure must not use a listening up), "active" (counted, not finished).
 */
export type ListeningSession = "idle" | "starting" | "active";

export interface ListeningStep {
  session: ListeningSession;
  /** The listening counts now. */
  count: boolean;
  /** The video started although no listening was asked for: pause it at once. */
  pause: boolean;
}

/** Transition of a listening on an event of the player. Pure, so the counting rule is testable alone. */
export function reduceListening(session: ListeningSession, event: "playing" | "ended" | "error"): ListeningStep {
  if (event === "playing") {
    if (session === "idle") return { session, count: false, pause: true };
    if (session === "starting") return { session: "active", count: true, pause: false };
    return { session, count: false, pause: false };
  }
  // Loading the passage again makes the player report the previous one as ended: not this listening.
  if (event === "ended" && session === "starting") return { session, count: false, pause: false };
  return { session: "idle", count: false, pause: false };
}

type Status = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Plays a passage of a YouTube video for a listening test, at most `LISTENING_MAX_PLAYS` times, in the
 * official player (youtube-nocookie.com), always visible, without controls or subtitles. Until the
 * first press nothing is requested from Google: the facade is plain markup. A listening counts the
 * first time the passage plays, not at the press; pausing, resuming and load errors do not count.
 * It never receives the answers.
 */
export function YouTubeListeningPlayer({
  video,
  title,
  initialPlays = 0,
  onPlaysChange,
}: {
  video: { youtubeId: string; start: number; end: number; title: string; channel: string };
  title: string;
  initialPlays?: number;
  onPlaysChange?: (plays: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [launched, setLaunched] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [plays, setPlays] = useState(initialPlays);
  const [status, setStatus] = useState<Status>("idle");
  const [session, setSessionState] = useState<ListeningSession>("idle");
  const sessionRef = useRef<ListeningSession>("idle");
  const playsRef = useRef(initialPlays);
  const onPlaysChangeRef = useRef(onPlaysChange);
  useEffect(() => {
    onPlaysChangeRef.current = onPlaysChange;
  });

  const { youtubeId, start, end } = video;

  function setSession(next: ListeningSession) {
    sessionRef.current = next;
    setSessionState(next);
  }

  // The player is created after the first press, and destroyed when leaving the screen.
  useEffect(() => {
    const container = containerRef.current;
    if (!launched || !container) return;
    let cancelled = false;
    let player: YTPlayer | null = null;
    const mount = document.createElement("div");
    container.appendChild(mount);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(mount, {
          videoId: youtubeId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { controls: 0, disablekb: 1, cc_load_policy: 0, iv_load_policy: 3, fs: 0, rel: 0, playsinline: 1 },
          events: {
            onReady: () => {
              if (cancelled || !player) return;
              playerRef.current = player;
              if (sessionRef.current === "starting") {
                player.loadVideoById({ videoId: youtubeId, startSeconds: start, endSeconds: end });
              }
            },
            onStateChange: ({ data }) => {
              if (cancelled || !player) return;
              if (data === STATE_PLAYING) {
                // cc_load_policy=0 does not override a viewer who turned subtitles on in YouTube: the
                // captions module loads with each video, so it is unloaded every time playback starts.
                player.unloadModule("captions");
                // An advert may play before the passage: it only counts once the passage itself plays.
                const time = player.getCurrentTime();
                if (sessionRef.current === "starting" && Number.isFinite(time) && time < start - 2) return;
                const step = reduceListening(sessionRef.current, "playing");
                setSession(step.session);
                if (step.pause) {
                  player.pauseVideo();
                  return;
                }
                if (step.count) {
                  playsRef.current += 1;
                  setPlays(playsRef.current);
                  onPlaysChangeRef.current?.(playsRef.current);
                }
                setStatus("playing");
              } else if (data === STATE_PAUSED) {
                if (sessionRef.current === "active") setStatus("paused");
              } else if (data === STATE_ENDED) {
                if (sessionRef.current === "starting") return;
                setSession(reduceListening(sessionRef.current, "ended").session);
                setStatus("idle");
              }
            },
            onError: () => {
              setSession(reduceListening(sessionRef.current, "error").session);
              setStatus("error");
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSession("idle");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        // The player may already be gone with its iframe.
      }
      mount.remove();
    };
  }, [launched, attempt, youtubeId, start, end]);

  // Safety net: the end bound is enforced by the player, this catches a video running past it.
  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      if (player.getCurrentTime() >= end + 1) {
        player.pauseVideo();
        setSession("idle");
        setStatus("idle");
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [status, end]);

  function press() {
    if (status === "loading") return;
    const player = playerRef.current;
    if (status === "playing") {
      player?.pauseVideo();
      return;
    }
    if (session === "active" && status === "paused") {
      player?.playVideo();
      return;
    }
    if (!canStartListening(playsRef.current)) return;
    setSession("starting");
    setStatus("loading");
    if (!launched) setLaunched(true);
    else if (player) player.loadVideoById({ videoId: youtubeId, startSeconds: start, endSeconds: end });
    else setAttempt((n) => n + 1);
  }

  const exhausted = !canStartListening(plays) && session === "idle" && status !== "loading" && status !== "playing";
  const label =
    status === "loading"
      ? "Chargement…"
      : status === "playing"
        ? "Pause"
        : status === "error"
          ? "Réessayer"
          : session === "active"
            ? "Reprendre"
            : plays > 0
              ? "Réécouter"
              : "Écouter";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {launched ? (
        <div ref={containerRef} className="aspect-video w-full overflow-hidden rounded-2xl bg-ink [&_iframe]:size-full [&_iframe]:border-0" />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-ink px-5 text-center text-paper">
          <span className="flex size-14 items-center justify-center rounded-full bg-paper text-ink">
            <PlayIcon width={28} height={28} />
          </span>
          <span className="text-xs opacity-70">Lue depuis YouTube</span>
        </div>
      )}
      <button
        type="button"
        onClick={press}
        disabled={exhausted || status === "loading"}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-ink px-6 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {exhausted ? `Tu as utilisé tes ${LISTENING_MAX_PLAYS} écoutes` : label}
      </button>
      <p role="status" className="text-sm text-muted">
        {plays > 0 ? `Écoute ${plays} sur ${LISTENING_MAX_PLAYS}` : `${LISTENING_MAX_PLAYS} écoutes possibles`}
      </p>
      <p className="text-xs leading-relaxed text-muted">
        Extrait de « {video.title} », {video.channel}, sur YouTube
      </p>
      <p className="text-xs leading-relaxed text-muted">Une publicité peut s’afficher avant l’extrait : elle ne compte pas comme une écoute.</p>
      {status === "error" && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          La vidéo n’a pas pu être chargée. Vérifie ta connexion puis réessaie : cette tentative ne compte pas comme une écoute.
        </p>
      )}
    </div>
  );
}

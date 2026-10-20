/**
 * YouTube links and embed URLs. Pure functions, no DOM: they run in the ingestion, in components
 * and, later, in a native app.
 */
import type { Language } from "@/lib/schemas/common";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

/** Id of a video from its `https://www.youtube.com/watch?v=<id>` link. Null for anything else (Shorts, channels, other hosts). */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  if (parsed.pathname !== "/watch") return null;
  const id = parsed.searchParams.get("v");
  return id !== null && VIDEO_ID.test(id) ? id : null;
}

/** The canonical link of a video, as stored in the catalogue of contents. */
export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Player address: privacy-enhanced domain, starts on load (the visitor already tapped play),
 * subtitles proposed in the studied language, interface in French.
 */
export function youtubeEmbedUrl(id: string, language: Language): string {
  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
    hl: "fr",
    cc_lang_pref: language,
    cc_load_policy: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

import { ASSESSMENT_LIMITS } from "@/lib/schemas/assessment";
import type { CefrLevel, Language } from "@/lib/schemas/common";

/** Public URL of the recording of a dossier; the file lives in `public/assessment/<language>/`. */
export function audioPublicPath(language: Language, id: string): string {
  return `/assessment/${language}/${id}.m4a`;
}

const SILENCE = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1";

/**
 * Arguments of the `ffmpeg` call that normalises a voice memo of any format: mono, 44.1 kHz, silences
 * trimmed at both ends (the second pass runs on the reversed signal), loudness normalised, AAC 64 kb/s
 * in an `.m4a` that starts quickly on iPhone. Video and the original metadata (a voice memo may
 * carry a place or a device name) are dropped. Passed to `execFile`, never to a shell.
 */
export function ffmpegArgs(input: string, output: string): string[] {
  const filters = [SILENCE, "areverse", SILENCE, "areverse", "loudnorm=I=-16:TP=-1.5:LRA=11"].join(",");
  return [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-i", input,
    "-vn",
    "-map_metadata", "-1",
    "-ac", "1",
    "-ar", "44100",
    "-af", filters,
    "-c:a", "aac",
    "-b:a", "64k",
    "-movflags", "+faststart",
    output,
  ];
}

export interface DurationCheck {
  ok: boolean;
  /** Seconds aimed at for the level. */
  target: number;
  min: number;
  max: number;
}

/** A recording must last the level's target, give or take 30 %. */
export function checkDuration(seconds: number, level: CefrLevel): DurationCheck {
  const target = ASSESSMENT_LIMITS[level].seconds;
  const min = (target * 7) / 10;
  const max = (target * 13) / 10;
  return { ok: seconds >= min && seconds <= max, target, min, max };
}

/** How the voice should read the script, by level (French: it is shown to the speaker). */
export function speakingPace(level: CefrLevel): string {
  if (level === "A1" || level === "A2") return "lent et bien articulé";
  if (level === "B1" || level === "B2") return "posé, presque naturel";
  return "naturel";
}

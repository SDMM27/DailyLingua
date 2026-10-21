/** The part of a `SpeechSynthesisVoice` that matters here (lets tests pass plain objects). */
export interface VoiceLike {
  lang: string;
  localService: boolean;
}

/** Primary subtag and region of a BCP 47 tag, case-insensitive; Android writes "de_DE" for "de-DE". */
function splitTag(tag: string): { primary: string; region: string | undefined } {
  const [primary, region] = tag.toLowerCase().split(/[-_]/u);
  return { primary, region };
}

/**
 * A voice of the device itself (`localService`: the text never leaves the device) that speaks
 * `language` (an ISO 639-1 code of the registry). With `regions` (the registry's `speechRegions`),
 * only voices of those regions qualify; otherwise any region. Null when there is none.
 */
export function findLocalVoice<V extends VoiceLike>(
  voices: readonly V[],
  language: string,
  regions?: readonly string[],
): V | null {
  const wanted = language.toLowerCase();
  const allowed = regions?.map((r) => r.toLowerCase());
  return (
    voices.find((voice) => {
      if (!voice.localService) return false;
      const { primary, region } = splitTag(voice.lang);
      return primary === wanted && (!allowed || (region !== undefined && allowed.includes(region)));
    }) ?? null
  );
}

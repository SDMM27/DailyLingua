import { buildRanks, type FrequencyRanks } from "@/lib/domain/frequency";
import type { Language } from "@/lib/schemas/common";

/**
 * Word-frequency lists of the languages (`data/<code>.json`, built by scripts/frequency/build.py),
 * turned into ranks and kept for the life of the process. Server side only, like everything that
 * reads the generation: the lists must not reach a client bundle. It imports neither Next.js nor
 * React, so the CLI scripts can load it too.
 */
const cache = new Map<Language, Promise<FrequencyRanks>>();

/** Ranks of the most frequent forms of a language, most frequent first (rank 1). */
export function loadFrequencyRanks(language: Language): Promise<FrequencyRanks> {
  let ranks = cache.get(language);
  if (!ranks) {
    ranks = import(`./data/${language}.json`).then((module: { default: string[] }) => buildRanks(language, module.default));
    // A failed load is not kept: the next call tries again.
    ranks.catch(() => cache.delete(language));
    cache.set(language, ranks);
  }
  return ranks;
}

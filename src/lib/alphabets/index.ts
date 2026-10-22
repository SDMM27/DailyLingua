import type { Language } from "@/lib/schemas/common";
import type { Alphabet, AlphabetGroup } from "@/lib/schemas/alphabet";
import { koAlphabet } from "./ko";
import { ruAlphabet } from "./ru";
import { ukAlphabet } from "./uk";

/**
 * Alphabets as authored (phases I1 and I2). Server side only: a page passes one group to the client,
 * never the whole map.
 */
export const ALPHABETS: Partial<Record<Language, Alphabet>> = {
  ko: koAlphabet,
  ru: ruAlphabet,
  uk: ukAlphabet,
};

/** Languages that have an alphabet. */
export function alphabetLanguages(): Language[] {
  return Object.keys(ALPHABETS) as Language[];
}

/** The group with this id, with the language of its alphabet, whatever its review state (visibility is `policy.ts`). */
export function alphabetGroup(id: string): { language: Language; alphabet: Alphabet; group: AlphabetGroup } | undefined {
  for (const language of alphabetLanguages()) {
    const alphabet = ALPHABETS[language];
    const group = alphabet?.groups.find((g) => g.id === id);
    if (alphabet && group) return { language, alphabet, group };
  }
  return undefined;
}

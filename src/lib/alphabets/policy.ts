import { readDraftPolicy, type DraftPolicy } from "@/lib/draft-policy";
import type { Alphabet, AlphabetGroup } from "@/lib/schemas/alphabet";
import type { Language } from "@/lib/schemas/common";
import { ALPHABETS, alphabetGroup } from ".";

export type AlphabetDraftPolicy = DraftPolicy;

/**
 * ALPHABET_DRAFTS: "show" or "hide" the alphabets no native speaker has approved yet
 * (`reviewedOn === null`). Same defaults as GRAMMAR_DRAFTS: "hide" in production (`VERCEL_ENV`),
 * "show" elsewhere.
 */
export function readAlphabetDraftPolicy(source: Record<string, string | undefined> = process.env): AlphabetDraftPolicy {
  return readDraftPolicy("ALPHABET_DRAFTS", source);
}

function isVisible(alphabet: Alphabet, policy: AlphabetDraftPolicy): boolean {
  return policy === "show" || alphabet.reviewedOn !== null;
}

/** The alphabet of a language if the learner may see it. */
export function visibleAlphabet(language: Language, policy: AlphabetDraftPolicy): Alphabet | undefined {
  const alphabet = ALPHABETS[language];
  return alphabet && isVisible(alphabet, policy) ? alphabet : undefined;
}

/** A visible group with the language and alphabet it belongs to, or undefined (unknown id, or a draft hidden by the policy). */
export function findVisibleAlphabetGroup(
  id: string,
  policy: AlphabetDraftPolicy,
): { language: Language; alphabet: Alphabet; group: AlphabetGroup } | undefined {
  const found = alphabetGroup(id);
  return found && isVisible(found.alphabet, policy) ? found : undefined;
}

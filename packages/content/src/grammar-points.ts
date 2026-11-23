import type { LanguageCode } from "@dailylingua/schemas";

/**
 * A1 grammar point ids of the legacy curricula (`src/lib/grammar/curricula/<lang>.ts`), copied here because
 * this package must not read the legacy app. `scripts/units-check.mts` compares this list with the curricula.
 */
export const GRAMMAR_POINT_IDS: Readonly<Record<string, readonly string[]>> = {
  ru: [
    "ru-a1-gender",
    "ru-a1-present-first",
    "ru-a1-present-second",
    "ru-a1-plural",
    "ru-a1-prepositional",
    "ru-a1-possessives",
  ],
  it: [
    "it-a1-articles",
    "it-a1-nouns",
    "it-a1-present",
    "it-a1-essere-avere",
    "it-a1-prepositions",
    "it-a1-possessives",
  ],
};

/** The grammar point ids a unit of `language` may reference (none for an unknown language). */
export function grammarIdsFor(language: LanguageCode): readonly string[] {
  return GRAMMAR_POINT_IDS[language] ?? [];
}

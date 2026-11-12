import { LANGUAGE_CODES, isValidNativeLanguage, languageDisplayName, languageInfo } from "@dailylingua/core";

export interface LanguageOption {
  code: string;
  /** Name in the interface language. */
  name: string;
  /** Name in the language itself, when it is a study language of the registry. */
  nativeName?: string;
}

/**
 * Every language accepted as a mother tongue, named in `locale` and sorted by that name: the
 * two-letter ISO 639-1 codes the runtime knows by name, plus the study languages of the registry.
 */
export function nativeLanguageOptions(locale: string): LanguageOption[] {
  const codes = new Set<string>(LANGUAGE_CODES);
  for (const a of "abcdefghijklmnopqrstuvwxyz") {
    for (const b of "abcdefghijklmnopqrstuvwxyz") {
      const code = `${a}${b}`;
      if (isValidNativeLanguage(code)) codes.add(code);
    }
  }
  // Two codes can share a name (ak and tw are both « Akan »): one row per name, the registry first.
  const byName = new Map<string, LanguageOption>();
  for (const code of [...LANGUAGE_CODES, ...[...codes].sort()]) {
    const name = languageDisplayName(code, locale);
    if (!byName.has(name)) byName.set(name, { code, name });
  }
  return sortByName([...byName.values()], locale);
}

/** The study languages of the registry, named in `locale`. */
export function targetLanguageOptions(locale: string): LanguageOption[] {
  return sortByName(
    LANGUAGE_CODES.map((code) => ({ code, name: languageDisplayName(code, locale), nativeName: languageInfo(code).nativeName })),
    locale,
  );
}

function sortByName<T extends { name: string }>(options: T[], locale: string): T[] {
  const collator = new Intl.Collator(locale);
  return options.sort((a, b) => collator.compare(a.name, b.name));
}

/** IANA time zones the runtime knows, for the settings screen. */
export function timeZoneOptions(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

function lowerWithoutAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

/** Options whose name (or native name, or code) contains `query`, ignoring case and accents. */
export function filterLanguages<T extends LanguageOption>(options: readonly T[], query: string): T[] {
  const needle = lowerWithoutAccents(query.trim());
  if (needle === "") return [...options];
  return options.filter((option) =>
    [option.name, option.nativeName ?? "", option.code].some((text) => lowerWithoutAccents(text).includes(needle)),
  );
}

/**
 * The mother tongue to preselect: the first language of `Accept-Language` the app accepts, else the
 * interface language.
 */
export function defaultNativeLanguage(acceptLanguage: string | null | undefined, uiLocale: string): string {
  const tags = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { base: tag.trim().toLowerCase().split("-")[0] ?? "", weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.weight > 0 && isValidNativeLanguage(entry.base))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return tags[0]?.base ?? uiLocale;
}

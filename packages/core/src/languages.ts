/**
 * Study (target) languages. Adding a language = adding an entry here and its code in `app.language`
 * (one-line migration). Nothing else hard-codes languages. The mother tongue is not limited to this
 * registry: any ISO 639 language is accepted (see `isValidNativeLanguage`).
 *
 * Display names are not stored: `languageDisplayName` derives them from the interface locale.
 */
export const ACCENTS = [
  "indigo",
  "terracotta",
  "olive",
  "plum",
  "teal",
  "ochre",
  "berry",
  "azure",
  "fern",
  "graphite",
] as const;
export type Accent = (typeof ACCENTS)[number];

export interface LanguageInfo {
  /** ISO 639 code, also used as the HTML `lang` attribute. */
  code: string;
  nativeName: string;
  greeting: string;
  /** Writing direction, for the HTML `dir` attribute of text in this language. */
  dir: "ltr" | "rtl";
  /**
   * Each character carries much more text (Chinese, Japanese, Korean): character limits on
   * quoted text, such as teasers, are lower so they stay as short as in other languages.
   */
  denseScript?: boolean;
  /**
   * Stress is not written in everyday text and is not predictable (Russian, Ukrainian): the
   * dictionary form of generated expressions carries a combining acute accent.
   */
  markStress?: boolean;
  /** Words are not separated by spaces (Chinese, Japanese): typed answers are compared without spaces. */
  unspaced?: boolean;
  /**
   * Short vowels and other marks are optional in everyday text (Arabic harakat): typed answers are
   * compared without them.
   */
  optionalVowelMarks?: boolean;
  /**
   * Common nouns are capitalised (German): a capital in mid-sentence does not mark a proper name,
   * so the word-frequency measure keeps those words.
   */
  capitalizedCommonNouns?: boolean;
  /**
   * Only voices of these regions read the language aloud, when a region of the same code speaks
   * another variety (a "zh-HK" voice speaks Cantonese, not Mandarin). Absent: any region.
   */
  speechRegions?: readonly string[];
  /**
   * Colour of the language in the UI. There are fewer accents than languages: the languages
   * people are most likely to study together get distinct accents.
   */
  accent: Accent;
}

export const LANGUAGE_REGISTRY = {
  fr: { code: "fr", nativeName: "Français", greeting: "Bonjour", dir: "ltr", accent: "azure" },
  ru: { code: "ru", nativeName: "Русский", greeting: "Доброе утро", dir: "ltr", markStress: true, accent: "indigo" },
  it: { code: "it", nativeName: "Italiano", greeting: "Buongiorno", dir: "ltr", accent: "terracotta" },
  es: { code: "es", nativeName: "Español", greeting: "Buenos días", dir: "ltr", accent: "ochre" },
  de: { code: "de", nativeName: "Deutsch", greeting: "Guten Morgen", dir: "ltr", capitalizedCommonNouns: true, accent: "teal" },
  en: { code: "en", nativeName: "English", greeting: "Good morning", dir: "ltr", accent: "plum" },
  pt: { code: "pt", nativeName: "Português", greeting: "Bom dia", dir: "ltr", accent: "olive" },
  nl: { code: "nl", nativeName: "Nederlands", greeting: "Goedemorgen", dir: "ltr", accent: "azure" },
  sv: { code: "sv", nativeName: "Svenska", greeting: "God morgon", dir: "ltr", accent: "fern" },
  pl: { code: "pl", nativeName: "Polski", greeting: "Dzień dobry", dir: "ltr", accent: "berry" },
  cs: { code: "cs", nativeName: "Čeština", greeting: "Dobré ráno", dir: "ltr", accent: "graphite" },
  uk: { code: "uk", nativeName: "Українська", greeting: "Доброго ранку", dir: "ltr", markStress: true, accent: "azure" },
  ro: { code: "ro", nativeName: "Română", greeting: "Bună dimineața", dir: "ltr", accent: "fern" },
  el: { code: "el", nativeName: "Ελληνικά", greeting: "Καλημέρα", dir: "ltr", accent: "azure" },
  tr: { code: "tr", nativeName: "Türkçe", greeting: "Günaydın", dir: "ltr", accent: "berry" },
  ar: { code: "ar", nativeName: "العربية", greeting: "صباح الخير", dir: "rtl", optionalVowelMarks: true, accent: "fern" },
  zh: { code: "zh", nativeName: "中文", greeting: "早上好", dir: "ltr", denseScript: true, unspaced: true, speechRegions: ["CN", "TW", "SG"], accent: "berry" },
  ja: { code: "ja", nativeName: "日本語", greeting: "おはようございます", dir: "ltr", denseScript: true, unspaced: true, accent: "graphite" },
  ko: { code: "ko", nativeName: "한국어", greeting: "좋은 아침이에요", dir: "ltr", denseScript: true, accent: "teal" },
  id: { code: "id", nativeName: "Bahasa Indonesia", greeting: "Selamat pagi", dir: "ltr", accent: "ochre" },
} as const satisfies Record<string, LanguageInfo>;

export type Language = keyof typeof LANGUAGE_REGISTRY;
export const LANGUAGE_CODES = Object.keys(LANGUAGE_REGISTRY) as [Language, ...Language[]];

export function languageInfo(code: Language): LanguageInfo {
  return LANGUAGE_REGISTRY[code];
}

/** Whether `code` is a study language of the registry. */
export function isTargetLanguage(code: string): code is Language {
  return Object.hasOwn(LANGUAGE_REGISTRY, code);
}

/** Name of `code` as written in `uiLocale`; falls back to the registry's native name, then to the code. */
export function languageDisplayName(code: string, uiLocale: string): string {
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: "language", fallback: "none" }).of(code);
    if (name) return name;
  } catch {
    // Malformed code or locale: use the fallbacks below.
  }
  return isTargetLanguage(code) ? LANGUAGE_REGISTRY[code].nativeName : code;
}

/** Whether `code` can be a mother tongue: 2 or 3 letters, and a language the runtime knows by name. */
export function isValidNativeLanguage(code: string): boolean {
  if (!/^[a-z]{2,3}$/.test(code)) return false;
  try {
    return new Intl.DisplayNames(["en"], { type: "language", fallback: "none" }).of(code) !== undefined;
  } catch {
    return false;
  }
}

/** A learner cannot study their own mother tongue. */
export function canLearn(nativeLanguage: string, target: string): boolean {
  return nativeLanguage !== target;
}

const RTL_LANGUAGES: ReadonlySet<string> = new Set(["ar", "he", "fa", "ur"]);

/** Writing direction of an interface language (any ISO 639 code). */
export function textDirection(code: string): "ltr" | "rtl" {
  return RTL_LANGUAGES.has(code) ? "rtl" : "ltr";
}

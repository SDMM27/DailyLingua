/**
 * Supported study languages. Adding a language = adding an entry here, inserting its code in
 * `public.languages` (one-line migration) and giving it at least one source in
 * `src/lib/content/catalog.ts` (a test enforces it). Nothing else in the app hard-codes languages.
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
  /** ISO 639-1 code, also used as the HTML `lang` attribute. */
  code: string;
  nameFr: string;
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
   * Colour of the language in the UI. There are fewer accents than languages: the languages
   * people are most likely to study together get distinct accents.
   */
  accent: Accent;
}

export const LANGUAGE_REGISTRY = {
  ru: { code: "ru", nameFr: "Russe", nativeName: "Русский", greeting: "Доброе утро", dir: "ltr", accent: "indigo" },
  it: { code: "it", nameFr: "Italien", nativeName: "Italiano", greeting: "Buongiorno", dir: "ltr", accent: "terracotta" },
  es: { code: "es", nameFr: "Espagnol", nativeName: "Español", greeting: "Buenos días", dir: "ltr", accent: "ochre" },
  de: { code: "de", nameFr: "Allemand", nativeName: "Deutsch", greeting: "Guten Morgen", dir: "ltr", accent: "teal" },
  en: { code: "en", nameFr: "Anglais", nativeName: "English", greeting: "Good morning", dir: "ltr", accent: "plum" },
  pt: { code: "pt", nameFr: "Portugais", nativeName: "Português", greeting: "Bom dia", dir: "ltr", accent: "olive" },
  nl: { code: "nl", nameFr: "Néerlandais", nativeName: "Nederlands", greeting: "Goedemorgen", dir: "ltr", accent: "azure" },
  sv: { code: "sv", nameFr: "Suédois", nativeName: "Svenska", greeting: "God morgon", dir: "ltr", accent: "fern" },
  pl: { code: "pl", nameFr: "Polonais", nativeName: "Polski", greeting: "Dzień dobry", dir: "ltr", accent: "berry" },
  cs: { code: "cs", nameFr: "Tchèque", nativeName: "Čeština", greeting: "Dobré ráno", dir: "ltr", accent: "graphite" },
  uk: { code: "uk", nameFr: "Ukrainien", nativeName: "Українська", greeting: "Доброго ранку", dir: "ltr", accent: "azure" },
  ro: { code: "ro", nameFr: "Roumain", nativeName: "Română", greeting: "Bună dimineața", dir: "ltr", accent: "fern" },
  el: { code: "el", nameFr: "Grec", nativeName: "Ελληνικά", greeting: "Καλημέρα", dir: "ltr", accent: "azure" },
  tr: { code: "tr", nameFr: "Turc", nativeName: "Türkçe", greeting: "Günaydın", dir: "ltr", accent: "berry" },
  ar: { code: "ar", nameFr: "Arabe", nativeName: "العربية", greeting: "صباح الخير", dir: "rtl", accent: "fern" },
  zh: { code: "zh", nameFr: "Chinois (mandarin)", nativeName: "中文", greeting: "早上好", dir: "ltr", denseScript: true, accent: "berry" },
  ja: { code: "ja", nameFr: "Japonais", nativeName: "日本語", greeting: "おはようございます", dir: "ltr", denseScript: true, accent: "graphite" },
  ko: { code: "ko", nameFr: "Coréen", nativeName: "한국어", greeting: "좋은 아침이에요", dir: "ltr", denseScript: true, accent: "teal" },
  id: { code: "id", nameFr: "Indonésien", nativeName: "Bahasa Indonesia", greeting: "Selamat pagi", dir: "ltr", accent: "ochre" },
} as const satisfies Record<string, LanguageInfo>;

export type Language = keyof typeof LANGUAGE_REGISTRY;
export const LANGUAGE_CODES = Object.keys(LANGUAGE_REGISTRY) as [Language, ...Language[]];

export function languageInfo(code: Language): LanguageInfo {
  return LANGUAGE_REGISTRY[code];
}

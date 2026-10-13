/**
 * Supported study languages. Adding a language = adding an entry here
 * (and, later, content sources for it). Nothing else in the app hard-codes languages.
 */
export const ACCENTS = ["indigo", "terracotta", "olive", "plum", "teal", "ochre"] as const;
export type Accent = (typeof ACCENTS)[number];

export interface LanguageInfo {
  /** ISO 639-1 code, also used as the HTML `lang` attribute. */
  code: string;
  nameFr: string;
  nativeName: string;
  greeting: string;
  accent: Accent;
}

export const LANGUAGE_REGISTRY = {
  ru: { code: "ru", nameFr: "Russe", nativeName: "Русский", greeting: "Доброе утро", accent: "indigo" },
  it: { code: "it", nameFr: "Italien", nativeName: "Italiano", greeting: "Buongiorno", accent: "terracotta" },
  es: { code: "es", nameFr: "Espagnol", nativeName: "Español", greeting: "Buenos días", accent: "ochre" },
  de: { code: "de", nameFr: "Allemand", nativeName: "Deutsch", greeting: "Guten Morgen", accent: "teal" },
  en: { code: "en", nameFr: "Anglais", nativeName: "English", greeting: "Good morning", accent: "plum" },
  pt: { code: "pt", nameFr: "Portugais", nativeName: "Português", greeting: "Bom dia", accent: "olive" },
} as const satisfies Record<string, LanguageInfo>;

export type Language = keyof typeof LANGUAGE_REGISTRY;
export const LANGUAGE_CODES = Object.keys(LANGUAGE_REGISTRY) as [Language, ...Language[]];

export function languageInfo(code: Language): LanguageInfo {
  return LANGUAGE_REGISTRY[code];
}

import { isTargetLanguage, languageInfo } from "@dailylingua/core";
import type { CSSProperties } from "react";

/**
 * The colour of a language, as the CSS variables the unit screens read (`--lang`, `--lang-soft`; `--on-lang` comes
 * from the theme). The registry names an accent per language; the colour pairs of the accents live in `globals.css`.
 */
export function languageStyle(language: string): CSSProperties {
  if (!isTargetLanguage(language)) return {};
  const accent = languageInfo(language).accent;
  return { "--lang": `var(--lang-${accent})`, "--lang-soft": `var(--lang-${accent}-soft)` } as CSSProperties;
}

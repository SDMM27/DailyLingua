import { isTargetLanguage, languageInfo } from "../languages";

/** Combining acute accent that marks the stressed vowel of Russian and Ukrainian dictionary forms. */
export const STRESS_MARK = "́";

/** Arabic harakat (fathatan to sukun, superscript alef) and tatweel. */
const ARABIC_VOWEL_MARKS = /[ً-ْٰـ]/g;

/**
 * The language-independent part of the normalisation (`j2-seance-contenu.md` §2.1): NFC, typographic
 * apostrophe made straight, lower case, spaces reduced, final punctuation (Greek question mark, CJK and
 * Arabic marks included) and Spanish `¿ ¡` in front removed.
 */
export function normalizeTypedText(text: string): string {
  return text
    .normalize("NFC")
    .replaceAll("’", "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(?:\s*[.!?…;。！？؟])+$/u, "")
    .replace(/^[¿¡]+\s*/u, "")
    .trim();
}

/**
 * Compares typed answers whatever the spacing, case (with the language's own rules: Turkish ı/İ), final
 * punctuation and typographic apostrophe; also, depending on the language registry, whatever the stress
 * mark and ё/е (Cyrillic), the spaces (Chinese, Japanese) or the short vowels (Arabic). A language
 * outside the registry gets the common part only.
 */
export function normalizeAnswer(language: string, text: string): string {
  let value = normalizeTypedText(text.toLocaleLowerCase(isTargetLanguage(language) ? language : undefined));
  if (!isTargetLanguage(language)) return value;
  const info = languageInfo(language);
  if (info.markStress) value = value.replaceAll(STRESS_MARK, "").replaceAll("ё", "е").normalize("NFC");
  if (info.optionalVowelMarks) value = value.replace(ARABIC_VOWEL_MARKS, "");
  if (info.unspaced) value = value.replace(/\s/g, "");
  return value;
}

/** NFD without the combining marks: "é" becomes "e", "ñ" "n". */
export function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

/** German digraphs: ä/ae, ö/oe, ü/ue and ß/ss are written the same way once folded to the right-hand form. */
export function foldGermanDigraphs(text: string): string {
  return text.replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss");
}

/** The folds under which two spellings count as the same word apart from their diacritics. */
export function diacriticFolds(language: string): readonly ((text: string) => string)[] {
  return language === "de" ? [stripDiacritics, (text) => stripDiacritics(foldGermanDigraphs(text))] : [stripDiacritics];
}

const APOSTROPHE = "'";

/** Punctuation inside a sentence replaced by a space, except the apostrophe (a contraction is a spelling variant). */
export function ignoreInnerPunctuation(text: string): string {
  return text
    .replace(/[\p{P}\p{S}]/gu, (mark) => (mark === APOSTROPHE ? mark : " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Commas and dashes replaced by a space (`transform` items: the order of the words still counts). */
export function ignoreCommasAndDashes(text: string): string {
  return text
    .replace(/[,،、，\-‐-―]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

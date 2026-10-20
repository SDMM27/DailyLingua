import type { Language } from "@/lib/schemas/common";
import { VOCABULARY_IMPORT_LIMITS, type VocabularyItem } from "@/lib/schemas/vocabulary";

/** One usable line of a paste. `line` is 1-based, counted on the raw text. */
export interface ParsedEntry {
  line: number;
  term: string;
  translation?: string;
  example?: string;
}

export interface ParseError {
  line: number;
  reason: string;
}

export interface ParsedPaste {
  entries: ParsedEntry[];
  errors: ParseError[];
}

/** Same word, whatever the case, the spacing or the Unicode form it was typed in. */
export function normalizeTermKey(term: string): string {
  return term.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

/**
 * Tried in this order, the first kind found on the line splits it: a line pasted from a
 * spreadsheet has tabs, whatever the cells contain. A dash only counts between spaces, so the
 * hyphen of « arc-en-ciel » is left alone.
 */
const SEPARATORS = [/\t/u, /;/u, /=/u, /\s[-–—]\s/u];

/** At most 3 fields (term, translation, example): the rest of the line, separators included, is the example. */
function splitFields(line: string): string[] {
  const separator = SEPARATORS.find((candidate) => candidate.test(line));
  if (!separator) return [line];
  const fields: string[] = [];
  let rest = line;
  while (fields.length < 2) {
    const match = separator.exec(rest);
    if (!match) break;
    fields.push(rest.slice(0, match.index).trim());
    rest = rest.slice(match.index + match[0].length);
  }
  fields.push(rest.trim());
  return fields;
}

/**
 * Reads a pasted list, one entry per line: `term ; translation ; example` (translation and example
 * are optional). Separators: tab, `;`, `=`, or a dash between spaces; the first kind found on the
 * line, in that order, splits it. Blank lines and lines starting with `#` are ignored. A line that
 * cannot be used is reported with its number instead of failing the whole paste.
 */
export function parseVocabularyPaste(text: string): ParsedPaste {
  const entries: ParsedEntry[] = [];
  const errors: ParseError[] = [];
  const seen = new Map<string, number>();
  const limits = VOCABULARY_IMPORT_LIMITS;

  text.split(/\r\n|\r|\n/u).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;

    const [term, translation, example] = splitFields(trimmed);
    const fail = (reason: string) => errors.push({ line, reason });
    if (!term) return fail("le mot est vide");
    if (term.length > limits.term) return fail(`le mot dépasse ${limits.term} caractères`);
    if (translation && translation.length > limits.translation) {
      return fail(`la traduction dépasse ${limits.translation} caractères`);
    }
    if (example && example.length > limits.example) return fail(`l’exemple dépasse ${limits.example} caractères`);

    const key = normalizeTermKey(term);
    const first = seen.get(key);
    if (first !== undefined) return fail(`doublon de la ligne ${first}`);
    seen.set(key, line);

    if (entries.length >= limits.entries) return fail(`au-delà de ${limits.entries} mots, à importer à part`);
    entries.push({ line, term, translation: translation || undefined, example: example || undefined });
  });

  return { entries, errors };
}

/**
 * Flags the entries whose word the user already has in `language` (case, spacing and Unicode form
 * ignored). The input is not modified.
 */
export function markExisting<T extends { term: string }>(
  entries: readonly T[],
  existing: readonly Pick<VocabularyItem, "language" | "term">[],
  language: Language,
): (T & { existing: boolean })[] {
  const known = new Set(existing.filter((item) => item.language === language).map((item) => normalizeTermKey(item.term)));
  return entries.map((entry) => ({ ...entry, existing: known.has(normalizeTermKey(entry.term)) }));
}

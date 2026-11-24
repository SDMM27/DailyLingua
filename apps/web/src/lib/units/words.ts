import type { SituationUnit } from "@dailylingua/schemas";

export type Gloss = SituationUnit["dialogue"]["glosses"][number];

/** A piece of a line: plain text, or a word of the unit's glossary (a button on screen). */
export type Segment = { text: string; gloss?: Gloss };

/** Combining acute accent: the stress mark of Russian. */
const ACUTE = String.fromCharCode(0x301);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The pattern of a gloss form: case-insensitive, and an acute accent (the stress mark of Russian, U+0301) may follow
 * any letter, so `привет` matches `приве́т`. Fixed expressions with spaces match as one word.
 */
function formPattern(form: string): string {
  return [...form.replaceAll(ACUTE, "").normalize("NFC")].map((char) => `${escape(char)}${ACUTE}?`).join("");
}

/**
 * Cuts a line into plain pieces and glossed words. A word is glossed when it is (or is part of a fixed expression
 * that is) a `form` of the unit's glossary, whole (not inside a longer word). The longest form wins.
 */
export function segmentLine(text: string, glosses: readonly Gloss[]): Segment[] {
  const normalized = text.normalize("NFC");
  const matchers = [...glosses]
    .sort((a, b) => b.form.length - a.form.length)
    .map((gloss) => ({ gloss, pattern: new RegExp(`(?<![\\p{L}\\p{N}])${formPattern(gloss.form)}(?![\\p{L}\\p{N}])`, "iuy") }));
  const segments: Segment[] = [];
  let plain = "";
  let index = 0;
  while (index < normalized.length) {
    let found: { gloss: Gloss; length: number } | null = null;
    for (const { gloss, pattern } of matchers) {
      pattern.lastIndex = index;
      const match = pattern.exec(normalized);
      if (match && match.index === index && match[0].length > 0) {
        found = { gloss, length: match[0].length };
        break;
      }
    }
    if (found) {
      if (plain) segments.push({ text: plain });
      plain = "";
      segments.push({ text: normalized.slice(index, index + found.length), gloss: found.gloss });
      index += found.length;
    } else {
      plain += normalized[index];
      index += 1;
    }
  }
  if (plain) segments.push({ text: plain });
  return segments;
}

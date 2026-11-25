import { countWords, normalizeAnswer } from "@dailylingua/core";
import type { OralSentence, SituationUnit, Unit } from "@dailylingua/schemas";
import { UNITS, unitsFor } from "./units";

/**
 * The sentences of the oral workshop (`j5-pr1-atelier-oral.md` §1): the lines of the dialogue and the key phrases that
 * have an audio, in the published situation units. Never a writing unit or a bilan.
 */

export interface OralOptions {
  /** Units that are not published are included (`UNIT_DRAFTS=show`, local work and previews only). */
  includeDrafts?: boolean;
}

const served = (unit: Unit, options: OralOptions): unit is SituationUnit =>
  unit.kind === "situation" && (unit.status === "published" || options.includeDrafts === true);

/** The sentences of one unit, before the removal of the duplicates between units. */
function sentencesOf(unit: SituationUnit): OralSentence[] {
  const base = { unitId: unit.id, unitVersion: unit.version, unitOrder: unit.order, language: unit.language };
  const sentence = (id: string, text: string, translation: OralSentence["translation"], audio: string): OralSentence => ({
    id: `${unit.id}#${id}`,
    ...base,
    text,
    translation,
    audio,
    words: Math.max(1, countWords(unit.language, text)),
  });
  const lines = unit.dialogue.lines.flatMap((line) => (line.audio === null ? [] : [sentence(line.id, line.text, line.translation, line.audio)]));
  const phrases = unit.keyPhrases.flatMap((phrase) => (phrase.audio === null ? [] : [sentence(phrase.id, phrase.text, phrase.translation, phrase.audio)]));
  return [...lines, ...phrases];
}

/**
 * The sentences of `language`, by unit order then order of appearance (lines, then key phrases). A sentence already
 * seen, once normalised, is dropped: the first occurrence wins (a key phrase that repeats a line appears once).
 */
export function oralSentences(language: string, options: OralOptions = {}): OralSentence[] {
  const seen = new Set<string>();
  const found: OralSentence[] = [];
  for (const unit of unitsFor(language)) {
    if (!served(unit, options)) continue;
    for (const sentence of sentencesOf(unit)) {
      const key = normalizeAnswer(language, sentence.text);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(sentence);
    }
  }
  return found;
}

/** The sentence with this id, or null: unit absent, not served, or no such sentence (nor one dropped as a duplicate). */
export function getOralSentence(id: string, options: OralOptions = {}): OralSentence | null {
  const unitId = id.split("#")[0] ?? "";
  const unit = Object.hasOwn(UNITS, unitId) ? UNITS[unitId] : undefined;
  if (!unit || !served(unit, options)) return null;
  return oralSentences(unit.language, options).find((sentence) => sentence.id === id) ?? null;
}

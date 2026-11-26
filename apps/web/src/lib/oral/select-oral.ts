import { valueToLevel } from "@dailylingua/core";
import type { OralSentence } from "@dailylingua/schemas";

/**
 * The choice of the sentences of the oral workshop (`j5-pr1-atelier-oral.md` §5), pure: the caller reads the units, the
 * progress and the attempts, this decides. No clock, no store.
 */

/** Longest sentence offered, in words: a beginner says it in one breath. */
export const ORAL_MAX_WORDS = 12;
/** Sentences said (anticipation, then repetition), and sentences dictated. */
export const ORAL_SENTENCE_COUNT = 6;
export const ORAL_DICTATION_COUNT = 3;

/** A sentence as the page receives it: the text (needed offline and to show the comparison), the translation in one language. */
export interface OralPacketSentence {
  id: string;
  unitVersion: string;
  text: string;
  translation: string;
  audio: string;
  words: number;
}

export interface OralPacket {
  language: string;
  sentences: OralPacketSentence[];
  dictation: OralPacketSentence[];
}

export interface OralSelectionInput {
  /** Every sentence the server serves in the language, in path order (`oralSentences`). */
  sentences: readonly OralSentence[];
  /** Units the learner has a `unit_progress` row for. */
  startedUnitIds: readonly string[];
  /** The unit the path map shows as current (the first one not passed), or null when all are passed. */
  currentUnitId: string | null;
  /** The learner's level in the language is A2 or above. */
  atLeastA2: boolean;
  /** Latest oral attempt of the learner on each sentence, in any activity (ISO instants). */
  lastAttemptAt: ReadonlyMap<string, string>;
}

/**
 * The sentences to work on, ranked: from the units the learner has opened, plus the current one; when that gives none
 * (a newcomer, or on a writing unit), every unit for a learner at A2 or above, otherwise the first unit. Sentences of
 * at most 12 words, the one not worked on for longest first (never worked on, before any), then by unit order.
 * `sentences` are the first 6 of the ranking, `dictation` the next 3, or the first ones again when fewer than 9 exist.
 */
export function selectOralSentences(input: OralSelectionInput): { sentences: OralSentence[]; dictation: OralSentence[] } {
  const { sentences: all, startedUnitIds, currentUnitId, atLeastA2, lastAttemptAt } = input;
  const eligible = new Set(startedUnitIds);
  if (currentUnitId !== null) eligible.add(currentUnitId);
  let pool = all.filter((sentence) => eligible.has(sentence.unitId));
  if (pool.length === 0) {
    const firstUnit = all[0]?.unitId;
    pool = atLeastA2 ? [...all] : all.filter((sentence) => sentence.unitId === firstUnit);
  }
  const ranked = pool
    .map((sentence, index) => ({ sentence, index, last: lastAttemptAt.get(sentence.id) ?? "" }))
    .filter(({ sentence }) => sentence.words <= ORAL_MAX_WORDS)
    .sort((a, b) => (a.last < b.last ? -1 : a.last > b.last ? 1 : 0) || a.sentence.unitOrder - b.sentence.unitOrder || a.index - b.index)
    .map(({ sentence }) => sentence);
  const sentences = ranked.slice(0, ORAL_SENTENCE_COUNT);
  const dictation = ranked.slice(ORAL_SENTENCE_COUNT, ORAL_SENTENCE_COUNT + ORAL_DICTATION_COUNT);
  // Fewer than 9 sentences: the first ones are dictated too, each once.
  for (const sentence of ranked) {
    if (dictation.length >= ORAL_DICTATION_COUNT) break;
    if (!dictation.includes(sentence)) dictation.push(sentence);
  }
  return { sentences, dictation };
}

/** The latest instant of the attempts on each sentence. */
export function lastAttemptBySentence(attempts: readonly { sentenceId: string; occurredAt: string }[]): Map<string, string> {
  const last = new Map<string, string>();
  for (const { sentenceId, occurredAt } of attempts) {
    const known = last.get(sentenceId);
    if (known === undefined || occurredAt > known) last.set(sentenceId, occurredAt);
  }
  return last;
}

/** A sentence as served to the page, translated into the explanation language. */
export function toPacketSentence(sentence: OralSentence, locale: "fr" | "en"): OralPacketSentence {
  return { id: sentence.id, unitVersion: sentence.unitVersion, text: sentence.text, translation: sentence.translation[locale], audio: sentence.audio, words: sentence.words };
}

/** The unit the path map shows as current: the first unit, in path order, the learner has not passed (as `buildPath` does). */
export function currentUnitIdOf(unitIds: readonly string[], passedUnitIds: ReadonlySet<string>): string | null {
  return unitIds.find((id) => !passedUnitIds.has(id)) ?? null;
}

/** Whether the mean of the skill estimates is A2 or above (no estimate: not known to be). */
export function isAtLeastA2(estimates: readonly { levelValue: number }[]): boolean {
  if (estimates.length === 0) return false;
  const mean = estimates.reduce((sum, estimate) => sum + estimate.levelValue, 0) / estimates.length;
  const level = valueToLevel(mean);
  return level !== "A0" && level !== "A1";
}

import { DICTATION_HIGH_ACCURACY, DICTATION_MIN_ACCURACY, SHADOWING_MIN_RATIO } from "@dailylingua/core";
import type { OralActivity, OralSelfRating } from "@dailylingua/schemas";
import type { UnitEvent } from "@/lib/units/events";
import type { OralPacketSentence } from "./select-oral";

/** Longest answer an `oral_attempt` carries (`MAX_ANSWER_CHARS`): a longer transcript is cut. */
const MAX_ANSWER = 200;

/** Minutes the workshop takes, as the entry screen and the card on Today say it. */
export const ORAL_MINUTES = 5;

/**
 * XP the learner is shown for a repetition (estimate: the server decides with its caps and its once-a-day rule). Only a
 * repetition judged by the device pays: a self-rated one never does.
 */
export function repeatXp(ratio: number): number {
  return ratio >= SHADOWING_MIN_RATIO ? 1 : 0;
}

/** XP shown for a dictation: 2 from 95 %, 1 from 80 % (estimate, as above). */
export function dictationXp(accuracy: number): number {
  return accuracy >= DICTATION_HIGH_ACCURACY ? 2 : accuracy >= DICTATION_MIN_ACCURACY ? 1 : 0;
}

/** What the learner did on one sentence said aloud. */
export interface SaidResult {
  /** The self-rating of the anticipation; absent when the sentence was not reached. */
  anticipation?: OralSelfRating;
  /** The last repetition. `ratio` is null for a self-rated one (no recognition), which is declared and pays nothing. */
  repeat?: { ratio: number | null; passed: boolean; declared: boolean };
}

export interface OralSummary {
  /** Estimated XP of the whole series. */
  xp: number;
  repeated: { count: number; passed: number };
  dictation: { count: number; average: number };
  anticipation: { had: number; total: number };
  /** Sentences to see again: not repeated well, not written well, or not known in the anticipation. */
  toReview: number;
}

/** The figures of the end screen, from what was done in the series. */
export function summarize(said: readonly SaidResult[], dictated: readonly number[]): OralSummary {
  const repeats = said.flatMap((result) => (result.repeat ? [result.repeat] : []));
  // « Au-dessus de 60 % » says what the device measured: a self-rated repetition has no share.
  const passed = repeats.filter((repeat) => repeat.ratio !== null && repeat.passed).length;
  const xp = repeats.reduce((sum, repeat) => sum + (repeat.ratio === null ? 0 : repeatXp(repeat.ratio)), 0)
    + dictated.reduce((sum, accuracy) => sum + dictationXp(accuracy), 0);
  const average = dictated.length === 0 ? 0 : dictated.reduce((sum, accuracy) => sum + accuracy, 0) / dictated.length;
  const toReview = said.filter((result) => result.anticipation === "not_yet" || (result.repeat !== undefined && !result.repeat.passed)).length
    + dictated.filter((accuracy) => accuracy < DICTATION_MIN_ACCURACY).length;
  return {
    xp,
    repeated: { count: repeats.length, passed },
    dictation: { count: dictated.length, average },
    anticipation: { had: said.filter((result) => result.anticipation === "got_it").length, total: said.filter((result) => result.anticipation !== undefined).length },
    toReview,
  };
}

/**
 * An `oral_attempt` event (`j5-pr1-atelier-oral.md` §3), before the queue adds the device fields. It never carries a
 * score or an XP: the server grades the answer. The instants are made consistent here (`shownAt <= startedAt < endedAt`):
 * a tap right after the screen appeared must not produce an event the server refuses.
 */
export function oralAttemptEvent(input: {
  sentence: OralPacketSentence;
  activity: OralActivity;
  /** The transcript (repetition), the typed text (dictation), "" (anticipation). */
  answer: string;
  recognizer: "device" | "none";
  selfRating: OralSelfRating | null;
  /** When the sentence appeared, when the speaking or the typing began, when it ended (epoch ms; `endedAt` defaults to now). */
  shownAt: number;
  startedAt: number;
  endedAt?: number;
}): UnitEvent {
  const endedAt = input.endedAt ?? Date.now();
  const startedAt = Math.min(input.startedAt, endedAt - 1);
  const shownAt = Math.min(input.shownAt, startedAt);
  return {
    kind: "oral_attempt",
    payload: {
      sentenceId: input.sentence.id,
      unitVersion: input.sentence.unitVersion,
      activity: input.activity,
      answer: input.answer.slice(0, MAX_ANSWER),
      recognizer: input.recognizer,
      selfRating: input.selfRating,
      shownAt: new Date(shownAt).toISOString(),
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
    },
  };
}

/** The sentence cut in two at a word, for the « repeat by chunks » tip (without the closing punctuation: the tip ends with its own); null for a single word. */
export function chunksOf(text: string): [string, string] | null {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return null;
  const middle = Math.ceil(words.length / 2);
  const clean = (chunk: string[]) => chunk.join(" ").replace(/[\s.,;:!?¡¿…。！？]+$/u, "");
  return [clean(words.slice(0, middle)), clean(words.slice(middle))];
}

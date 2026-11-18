import type { DateKey } from "@dailylingua/schemas";
import { localTime } from "../dates";
import type { MemoryState } from "./fsrs";

/** Review interval of Leitner boxes 0 to 6 (the legacy `BOX_INTERVALS_DAYS`). */
export const LEITNER_INTERVALS_DAYS = [1, 2, 4, 8, 16, 32, 64] as const;

/** Difficulty given to every converted card: the middle of FSRS's 1..10 scale. */
export const LEGACY_DIFFICULTY = 5.0;

/** Hour (local) at which a converted card becomes due, and hour of its last review. */
const DUE_TIME = "04:00";
const LAST_REVIEW_TIME = "12:00";

export interface LeitnerCard {
  box: number;
  dueOn: DateKey;
  lastReviewedOn: DateKey | null;
  reviewCount: number;
  /** Number of reviews answered "again" (0 when no review log exists). */
  againCount: number;
  /** The word was set aside as known. */
  known: boolean;
}

/**
 * FSRS memory of a legacy Leitner card (rule of `j1-pr1-schema-app.md` §4.1, mirrored by the SQL
 * migration): stability = interval of the box, difficulty 5.0, due at 04:00 local on `dueOn` (never
 * earlier than before), last review at 12:00 local on `lastReviewedOn`. A `known` card stays known; a
 * card never reviewed is `new`; any other is `review`.
 */
export function leitnerToMemoryState(card: LeitnerCard, timeZone: string): MemoryState {
  const box = Math.min(LEITNER_INTERVALS_DAYS.length - 1, Math.max(0, Math.trunc(card.box)));
  return {
    state: card.known ? "known" : card.lastReviewedOn === null ? "new" : "review",
    stability: LEITNER_INTERVALS_DAYS[box] as number,
    difficulty: LEGACY_DIFFICULTY,
    dueAt: localTime(card.dueOn, DUE_TIME, timeZone),
    lastReviewAt: card.lastReviewedOn === null ? null : localTime(card.lastReviewedOn, LAST_REVIEW_TIME, timeZone),
    reps: card.reviewCount,
    lapses: card.againCount,
  };
}

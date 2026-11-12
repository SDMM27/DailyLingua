import type { CardState, ReviewRating } from "@dailylingua/schemas";
import { createEmptyCard, fsrs, State, type FSRS, type Grade } from "ts-fsrs";

/** Memory of one card, with the names of the `app.card` columns (`ts-fsrs` stays an implementation detail). */
export interface MemoryState {
  state: CardState;
  /** Days for the recall probability to fall to 90 %. Null until the first review. */
  stability: number | null;
  /** 1 (easy) to 10 (hard). Null until the first review. */
  difficulty: number | null;
  dueAt: Date;
  lastReviewAt: Date | null;
  reps: number;
  lapses: number;
}

export interface ScheduleOptions {
  /** Probability of recall aimed at when a review is due. Default 0.90, bounded to 0.80-0.95. */
  targetRetention?: number;
}

export interface ScheduleResult {
  state: MemoryState;
  /** Whole days between this review and the next due date. */
  scheduledDays: number;
  /** Days (fractional) between the previous review and this one; 0 for a first review. */
  elapsedDays: number;
}

export const DEFAULT_TARGET_RETENTION = 0.9;
export const MIN_TARGET_RETENTION = 0.8;
export const MAX_TARGET_RETENTION = 0.95;

const MS_PER_DAY = 86_400_000;

/** Retention actually used: the default when absent or not a number, otherwise bounded to 0.80-0.95. */
export function clampTargetRetention(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return DEFAULT_TARGET_RETENTION;
  return Math.min(MAX_TARGET_RETENTION, Math.max(MIN_TARGET_RETENTION, value));
}

// Fuzz is off (reviews must be reproducible) and so are sub-day learning steps: a card is scheduled
// in whole days from its first answer, which suits a daily session. Within-day steps (`relearning`,
// new cards seen again after a few minutes) are deliberately disabled in this batch: milestone 2.
const schedulers = new Map<number, FSRS>();
function schedulerFor(retention: number): FSRS {
  let scheduler = schedulers.get(retention);
  if (!scheduler) {
    scheduler = fsrs({ request_retention: retention, enable_fuzz: false, enable_short_term: false });
    schedulers.set(retention, scheduler);
  }
  return scheduler;
}

const FROM_LIB: Record<State, CardState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

const TO_LIB: Partial<Record<CardState, State>> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** A card that has never been answered: due now, no memory. */
export function newCardState(now: Date): MemoryState {
  return { state: "new", stability: null, difficulty: null, dueAt: now, lastReviewAt: null, reps: 0, lapses: 0 };
}

/**
 * Next memory state after answering `rating` (1 again … 4 easy) at `now`. Pure: the clock is `now`.
 * Throws for a suspended or known card (it is not scheduled) and for a started card without memory values.
 */
export function schedule(
  current: MemoryState,
  rating: ReviewRating,
  now: Date,
  options: ScheduleOptions = {},
): ScheduleResult {
  const libState = TO_LIB[current.state];
  if (libState === undefined) throw new RangeError(`A ${current.state} card is not scheduled`);
  const started = libState !== State.New;
  if (started && (current.stability === null || current.difficulty === null || current.lastReviewAt === null)) {
    throw new RangeError(`A ${current.state} card needs stability, difficulty and lastReviewAt`);
  }

  const scheduler = schedulerFor(clampTargetRetention(options.targetRetention));
  const elapsedDays = current.lastReviewAt && started ? Math.max(0, (now.getTime() - current.lastReviewAt.getTime()) / MS_PER_DAY) : 0;
  const card = started
    ? {
        due: current.dueAt,
        stability: current.stability as number,
        difficulty: current.difficulty as number,
        elapsed_days: Math.round(elapsedDays),
        scheduled_days: Math.max(0, Math.round((current.dueAt.getTime() - (current.lastReviewAt as Date).getTime()) / MS_PER_DAY)),
        learning_steps: 0,
        reps: current.reps,
        lapses: current.lapses,
        state: libState,
        last_review: current.lastReviewAt as Date,
      }
    : createEmptyCard(now);

  const next = scheduler.next(card, now, rating as Grade).card;
  return {
    state: {
      state: FROM_LIB[next.state],
      stability: next.stability,
      difficulty: next.difficulty,
      dueAt: next.due,
      lastReviewAt: next.last_review ?? now,
      reps: next.reps,
      lapses: next.lapses,
    },
    scheduledDays: next.scheduled_days,
    elapsedDays,
  };
}

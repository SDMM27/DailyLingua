import type { DateKey, SessionFormat, SessionKind, SessionStep } from "@dailylingua/schemas";
import { addDays, diffInDays } from "../dates";

/**
 * The plan of the day (`j2-seance-contenu.md` §1, §2.4, §5, §6, §7): budgets per step and format, the caps of the
 * Réveil, the order cards are served in, the return after an absence, the error of the day and the adaptive
 * density. Pure: no clock, no store; the caller passes the instant and the state.
 */

/** Steps that make a session; the Bilan (`review`) is a screen, not a step to validate. */
export type PlanStep = Exclude<SessionStep, "review">;
export const PLAN_STEPS: readonly PlanStep[] = ["wake", "reading", "workshop", "expression", "momentum"];

/** Minutes per step and format (`j2-seance-contenu.md` §1.1). At format 10 the workshop and the momentum alternate. */
export const STEP_MINUTES: Record<SessionFormat, Record<PlanStep, number>> = {
  10: { wake: 2, reading: 3, workshop: 1.5, expression: 3, momentum: 1.5 },
  15: { wake: 3, reading: 4.5, workshop: 2, expression: 4, momentum: 1.5 },
  20: { wake: 4, reading: 6, workshop: 3, expression: 5, momentum: 2 },
  30: { wake: 6, reading: 9, workshop: 4.5, expression: 7.5, momentum: 3 },
};

export interface PlannedStep {
  step: PlanStep;
  /** Minutes budgeted; 0 for a step the format leaves out today. */
  minutes: number;
  required: boolean;
}

/**
 * The steps of a session, in the order they are proposed (any order is allowed on screen). At format 10 one of the
 * workshop and the momentum is left out: the alternation follows the parity of the number of 10 minute sessions
 * completed (even: workshop, odd: momentum), so it survives missed days.
 */
export function sessionSteps(format: SessionFormat, completedShortSessions = 0): PlannedStep[] {
  return PLAN_STEPS.map((step) => {
    const leftOut = format === 10 && (step === "workshop" ? completedShortSessions % 2 === 1 : step === "momentum" ? completedShortSessions % 2 === 0 : false);
    return { step, minutes: leftOut ? 0 : STEP_MINUTES[format][step], required: !leftOut };
  });
}

/** Caps of the Réveil (`j2-seance-contenu.md` §6): time budget, cards planned at most, new cards a day (every source). */
export const WAKE_LIMITS: Record<SessionFormat, { budgetMinutes: number; maxCards: number; newCardsPerDay: number }> = {
  10: { budgetMinutes: 2, maxCards: 15, newCardsPerDay: 6 },
  15: { budgetMinutes: 3, maxCards: 22, newCardsPerDay: 9 },
  20: { budgetMinutes: 4, maxCards: 30, newCardsPerDay: 11 },
  30: { budgetMinutes: 6, maxCards: 45, newCardsPerDay: 14 },
};

/** Learning days without a session after which the next one is a resumption. */
export const RESUMPTION_AFTER_DAYS = 3;
/** Cap of the Réveil of a resumption session, whatever the format. */
export const RESUMPTION_WAKE_CAP = 20;
/** Days new cards stay suspended after a resumption (the day of the session and the next one). */
export const NEW_CARDS_SUSPENDED_DAYS = 2;
/** Workshop words that become cards while new cards are suspended. */
export const RESUMPTION_WORKSHOP_CARDS = 3;
/** The format a resumption session starts with. */
export const RESUMPTION_FORMAT: SessionFormat = 10;

/**
 * Whether a session on `today` is a return after an absence: at least 3 whole learning days without a session
 * since `lastSessionDay` (null: the learner has never had one, which is not an absence).
 */
export function isResumption(lastSessionDay: DateKey | null, today: DateKey): boolean {
  return lastSessionDay !== null && diffInDays(lastSessionDay, today) - 1 >= RESUMPTION_AFTER_DAYS;
}

/** Last day (included) new cards stay suspended after a resumption session on `today`. */
export function newCardsSuspendedThrough(today: DateKey): DateKey {
  return addDays(today, NEW_CARDS_SUSPENDED_DAYS - 1);
}

/** Comprehension questions served in the reading (one of them after listening only), by format. */
export const READING_QUESTIONS: Record<SessionFormat, number> = { 10: 3, 15: 4, 20: 4, 30: 4 };

/** Workshop composition (`j2-seance-contenu.md` §2.4). */
export interface WorkshopComposition {
  words: number;
  wordMcq: number;
  wordCloze: number;
  grammarCloze: number;
  grammarTransform: number;
  total: number;
}

const workshop = (words: number, wordMcq: number, wordCloze: number, grammarCloze: number, grammarTransform: number): WorkshopComposition => ({
  words,
  wordMcq,
  wordCloze,
  grammarCloze,
  grammarTransform,
  total: wordMcq + wordCloze + grammarCloze + grammarTransform,
});

export const WORKSHOP_COMPOSITION: Record<SessionFormat, WorkshopComposition> = {
  10: workshop(5, 5, 0, 2, 0),
  15: workshop(6, 6, 0, 2, 1),
  20: workshop(7, 7, 3, 2, 2),
  30: workshop(8, 8, 4, 3, 2),
};

/** Words of the momentum passage: 120, 180, 250 at the shorter formats; at 30 the whole text plus 180 words of yesterday's. */
export const MOMENTUM_WORDS: Record<SessionFormat, number | "whole_text_plus_180"> = { 10: 120, 15: 180, 20: 250, 30: "whole_text_plus_180" };

/** Sentences to rewrite after the correction: 1 at format 10, otherwise 2. */
export function rewriteSentenceCount(format: SessionFormat): number {
  return format === 10 ? 1 : 2;
}

/** What the plan of the day needs to know of a card. */
export interface PlanCard {
  id: string;
  /** `new` for a card never answered (a migrated card, for example); others are scheduled. */
  state: "new" | "learning" | "review" | "relearning" | "suspended" | "known";
  dueAt: Date;
  stability: number | null;
  lastReviewAt: Date | null;
  /** Rating of the last review made the day before, null when it was not rated that day. */
  lastRatingYesterday: number | null;
}

export interface WakePlanInput {
  format: SessionFormat;
  now: Date;
  cards: readonly PlanCard[];
  /** Item of the error of yesterday, served first, or null. */
  errorItemId: string | null;
  /** The session is a return after an absence. */
  resumption: boolean;
  /** New cards already introduced today, from every source. */
  newCardsToday: number;
  /** Last day new cards are suspended (a previous resumption), or null. */
  newCardsSuspendedThrough: DateKey | null;
  today: DateKey;
}

export interface WakePlan {
  /** Cards to serve, in order: the error item is separate. */
  cardIds: string[];
  errorItemId: string | null;
  /** Of `cardIds`, the new ones. */
  newCardIds: string[];
  budgetMinutes: number;
  maxCards: number;
  /** Cards due that did not fit in the plan: they stay due, no counter is shown. */
  leftDue: number;
}

/** Overdue ratio `t / S` of a card: it grows as the probability of recall falls, so a high ratio is the weakest card. */
function overdueRatio(card: PlanCard, now: Date): number {
  if (card.lastReviewAt === null || card.stability === null || card.stability <= 0) return Number.POSITIVE_INFINITY;
  return (now.getTime() - card.lastReviewAt.getTime()) / (card.stability * 86_400_000);
}

const byWeakest = (now: Date) => (a: PlanCard, b: PlanCard) => {
  const ra = overdueRatio(a, now);
  const rb = overdueRatio(b, now);
  if (ra !== rb) return rb > ra ? 1 : -1;
  return a.dueAt.getTime() - b.dueAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
};

/**
 * The Réveil of the day. Order of service (`j2-seance-contenu.md` §6): the error of yesterday (aside), the cards
 * missed yesterday (reconquest), the other due cards from the weakest recall to the strongest, then the new cards in
 * what remains of the day's limit. The first cap reached stops it: the format's number of cards (20 after an
 * absence). New cards are held back during a suspension, and while the due cards alone exceed the cap.
 */
export function planWake(input: WakePlanInput): WakePlan {
  const { format, now, cards, resumption, today } = input;
  const limits = WAKE_LIMITS[format];
  const maxCards = resumption ? RESUMPTION_WAKE_CAP : limits.maxCards;
  const scheduled = cards.filter((card) => card.state !== "suspended" && card.state !== "known");
  const due = scheduled.filter((card) => card.state !== "new" && card.dueAt.getTime() <= now.getTime());
  const reconquest = due.filter((card) => card.lastRatingYesterday === 1).sort(byWeakest(now));
  const others = due.filter((card) => card.lastRatingYesterday !== 1).sort(byWeakest(now));
  const ordered = [...reconquest, ...others];

  const suspended = resumption || (input.newCardsSuspendedThrough !== null && today <= input.newCardsSuspendedThrough);
  const newRoom = suspended || ordered.length > maxCards ? 0 : Math.max(0, limits.newCardsPerDay - input.newCardsToday);
  const fresh = scheduled
    .filter((card) => card.state === "new")
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || (a.id < b.id ? -1 : 1))
    .slice(0, Math.min(newRoom, Math.max(0, maxCards - ordered.length)));

  const picked = [...ordered.slice(0, maxCards), ...fresh];
  return {
    cardIds: picked.map((card) => card.id),
    errorItemId: input.errorItemId,
    newCardIds: fresh.map((card) => card.id),
    budgetMinutes: limits.budgetMinutes,
    maxCards,
    leftDue: Math.max(0, ordered.length - maxCards),
  };
}

export interface DayPlan {
  format: SessionFormat;
  kind: SessionKind;
  steps: PlannedStep[];
  wake: WakePlan;
  readingQuestions: number;
  workshop: WorkshopComposition | null;
  rewriteSentences: number;
  /** Words of the momentum passage, null when the step is left out today. */
  momentumWords: number | "whole_text_plus_180" | null;
  resumption: boolean;
  /** Workshop words that become cards: all of them, or only the 3 most frequent while new cards are suspended. */
  workshopCards: number;
  /** Last day new cards stay suspended, when this session is a resumption. */
  newCardsSuspendedThrough: DateKey | null;
}

export interface DayPlanInput {
  /** Format chosen by the learner; a resumption session starts at 10 unless `format` was set explicitly. */
  format: SessionFormat;
  /** True when the learner chose the format of this session by hand. */
  formatChosen?: boolean;
  kind: SessionKind;
  now: Date;
  today: DateKey;
  cards: readonly PlanCard[];
  errorItemId: string | null;
  lastSessionDay: DateKey | null;
  completedShortSessions: number;
  newCardsToday: number;
  newCardsSuspendedThrough: DateKey | null;
}

/**
 * The plan of the day. A `catch_up` session is a 10 minute session (the next text of the queue, no `session.complete`);
 * a `review_only` session is the Réveil alone. After an absence the proposed format is 10 and new cards are suspended.
 */
export function planDay(input: DayPlanInput): DayPlan {
  const resumption = input.kind === "daily" && isResumption(input.lastSessionDay, input.today);
  const format: SessionFormat = input.kind === "catch_up" || (resumption && !input.formatChosen) ? RESUMPTION_FORMAT : input.format;
  const all = sessionSteps(format, input.completedShortSessions);
  const steps = input.kind === "review_only" ? all.map((step) => (step.step === "wake" ? step : { ...step, minutes: 0, required: false })) : all;
  const suspendedThrough = resumption ? newCardsSuspendedThrough(input.today) : input.newCardsSuspendedThrough;
  const active = (step: PlanStep) => steps.find((s) => s.step === step)?.required === true;
  return {
    format,
    kind: input.kind,
    steps,
    wake: planWake({
      format,
      now: input.now,
      cards: input.cards,
      errorItemId: input.errorItemId,
      resumption,
      newCardsToday: input.newCardsToday,
      newCardsSuspendedThrough: suspendedThrough,
      today: input.today,
    }),
    readingQuestions: active("reading") ? READING_QUESTIONS[format] : 0,
    workshop: active("workshop") ? WORKSHOP_COMPOSITION[format] : null,
    rewriteSentences: active("expression") ? rewriteSentenceCount(format) : 0,
    momentumWords: active("momentum") ? MOMENTUM_WORDS[format] : null,
    resumption,
    workshopCards: resumption || (suspendedThrough !== null && input.today <= suspendedThrough) ? RESUMPTION_WORKSHOP_CARDS : WORKSHOP_COMPOSITION[format].words,
    newCardsSuspendedThrough: suspendedThrough,
  };
}

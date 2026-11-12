import type { CardState } from "@dailylingua/schemas";

/** What the queue needs of a card; any richer card type works. */
export interface QueueCard {
  state: CardState;
  dueAt: Date;
}

const MS_PER_DAY = 86_400_000;

/** Suspended and known cards never enter a review. */
function isScheduled(card: QueueCard): boolean {
  return card.state !== "suspended" && card.state !== "known";
}

/** Cards due at `now` or before, most overdue first (ties keep their order). */
export function dueCards<T extends QueueCard>(cards: readonly T[], now: Date): T[] {
  return cards
    .filter((card) => isScheduled(card) && card.dueAt.getTime() <= now.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export interface QueueCap {
  /** Time the learner has for reviews. */
  maxMinutes: number;
  /** Estimated time per card. */
  secondsPerCard: number;
}

/** The first cards of an already ordered queue that fit in the time budget. */
export function capQueue<T>(cards: readonly T[], { maxMinutes, secondsPerCard }: QueueCap): T[] {
  if (!(maxMinutes > 0) || !(secondsPerCard > 0)) return [];
  return cards.slice(0, Math.floor((maxMinutes * 60) / secondsPerCard));
}

/**
 * Spreads the overdue cards over `days` days (the most overdue first, in even shares): the first share
 * stays due now, the next ones become due 1, 2… days after `now`. A due date only ever moves later,
 * and cards that are not overdue (or are suspended or known) are returned unchanged. The result has
 * the same order as the input; nothing is mutated.
 */
export function spreadBacklog<T extends QueueCard>(cards: readonly T[], now: Date, { days }: { days: number }): T[] {
  const slots = Math.max(1, Math.floor(days));
  const overdue = dueCards(cards, now);
  const newDue = new Map<T, Date>();
  overdue.forEach((card, index) => {
    const day = Math.floor((index * slots) / overdue.length);
    if (day > 0) newDue.set(card, new Date(now.getTime() + day * MS_PER_DAY));
  });
  return cards.map((card) => {
    const dueAt = newDue.get(card);
    return dueAt ? { ...card, dueAt } : card;
  });
}

import type { DateKey } from "@/lib/schemas/common";
import type { ReviewGrade, ReviewState, VocabularyItem, VocabularyList } from "@/lib/schemas/vocabulary";
import { addDays, diffInDays } from "./dates";

/**
 * Simple Leitner system: each box has a fixed review interval.
 * Box 0 holds new or forgotten words; a correct answer moves a word up one box,
 * "easy" moves it up two, "again" sends it back to box 0.
 */
export const BOX_INTERVALS_DAYS = [1, 2, 4, 8, 16, 32, 64] as const;
export const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;

function intervalFor(box: number): number {
  return BOX_INTERVALS_DAYS[Math.min(Math.max(box, 0), MAX_BOX)];
}

export function initialReviewState(today: DateKey): ReviewState {
  return { box: 0, dueOn: today, lastReviewedOn: null, reviewCount: 0 };
}

export function applyReview(state: ReviewState, grade: ReviewGrade, today: DateKey): ReviewState {
  let box: number;
  let interval: number;
  switch (grade) {
    case "again":
      box = 0;
      interval = intervalFor(0);
      break;
    case "hard":
      box = state.box;
      interval = Math.max(1, Math.floor(intervalFor(state.box) / 2));
      break;
    case "good":
      box = Math.min(state.box + 1, MAX_BOX);
      interval = intervalFor(box);
      break;
    case "easy":
      box = Math.min(state.box + 2, MAX_BOX);
      interval = intervalFor(box);
      break;
  }
  return {
    box,
    dueOn: addDays(today, interval),
    lastReviewedOn: today,
    reviewCount: state.reviewCount + 1,
  };
}

export function isDue(state: ReviewState, today: DateKey): boolean {
  return diffInDays(state.dueOn, today) >= 0;
}

/** Words that are not in a paused list: the only ones that enter the review. */
export function inActiveLists(items: readonly VocabularyItem[], lists: readonly VocabularyList[]): VocabularyItem[] {
  const paused = new Set(lists.filter((list) => !list.active).map((list) => list.id));
  return items.filter((item) => item.listId === undefined || !paused.has(item.listId));
}

/** Words still being learned (paused lists left out), ordered by due date (most overdue first). */
export function upcomingReviews(items: readonly VocabularyItem[], lists: readonly VocabularyList[]): VocabularyItem[] {
  return inActiveLists(items, lists)
    .filter((item) => item.status === "learning")
    .sort(
      (a, b) => a.review.dueOn.localeCompare(b.review.dueOn) || a.term.localeCompare(b.term),
    );
}

/** Anything scheduled like a vocabulary item (words, correction cards). */
export interface Reviewable {
  status: "learning" | "known";
  review: ReviewState;
}

/** Items still being learned and due today, most overdue first (ties keep their order). */
export function dueItems<T extends Reviewable>(items: readonly T[], today: DateKey): T[] {
  return items
    .filter((item) => item.status === "learning" && isDue(item.review, today))
    .sort((a, b) => a.review.dueOn.localeCompare(b.review.dueOn));
}

/** Words to review today: still being learned, due, and not in a paused list. */
export function dueToday(
  items: readonly VocabularyItem[],
  today: DateKey,
  lists: readonly VocabularyList[],
): VocabularyItem[] {
  return upcomingReviews(items, lists).filter((item) => isDue(item.review, today));
}

export function relativeDueLabel(dueOn: DateKey, today: DateKey): string {
  const days = diffInDays(today, dueOn);
  if (days < 0) return "en retard";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} j`;
}

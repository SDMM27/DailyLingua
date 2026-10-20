"use client";

import { useState } from "react";
import { deleteCorrectionCard, reviewCorrection } from "@/app/actions/correction-cards";
import { languageStyle } from "@/components/ui/language-style";
import { applyReview, dueItems, relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { DateKey } from "@/lib/schemas/common";
import type { CorrectionCard } from "@/lib/schemas/correction-card";
import type { ReviewGrade } from "@/lib/schemas/vocabulary";
import { CORRECTION_CATEGORY_LABELS } from "@/lib/schemas/writing-feedback";
import { CorrectionReviewSession } from "./correction-review-session";

/**
 * "Mes erreurs à revoir": the review of the cards due today and the list of all cards. Grades are
 * applied on screen at once and saved by a server action; a change the server refuses is rolled
 * back and reported. `persist` is false in the demo, where changes only live in memory.
 */
export function CorrectionReview({
  initialCards,
  today,
  persist,
}: {
  initialCards: CorrectionCard[];
  today: DateKey;
  persist: boolean;
}) {
  const [cards, setCards] = useState(initialCards);
  // Fixed at load so grading a card doesn't reshuffle the session.
  const [queue] = useState(() => dueItems(initialCards, today));
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, change: (card: CorrectionCard) => CorrectionCard) =>
    setCards((list) => list.map((card) => (card.id === id ? change(card) : card)));

  const handleReviewed = async (reviewed: CorrectionCard, grade: ReviewGrade) => {
    const before = reviewed.review;
    update(reviewed.id, (card) => ({ ...card, review: applyReview(card.review, grade, today) }));
    if (!persist) return;
    const result = await reviewCorrection({ id: reviewed.id, grade, expectedReviewCount: before.reviewCount });
    if (result.ok) {
      update(reviewed.id, (card) => ({ ...card, review: result.data.review }));
      setError(null);
    } else {
      update(reviewed.id, (card) => ({ ...card, review: before }));
      setError(`« ${reviewed.original} » n’a pas été enregistré : ${result.error}`);
    }
  };

  const handleDelete = async (card: CorrectionCard) => {
    if (persist) {
      const result = await deleteCorrectionCard({ id: card.id });
      if (!result.ok) return setError(result.error);
    }
    setCards((list) => list.filter((c) => c.id !== card.id));
    setError(null);
  };

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <CorrectionReviewSession queue={queue} today={today} onReviewed={handleReviewed} />

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">
          Toutes mes erreurs ({cards.length})
        </summary>
        <ul className="mt-3 space-y-2">
          {[...cards]
            .sort((a, b) => a.review.dueOn.localeCompare(b.review.dueOn))
            .map((card) => (
              <li key={card.id} className="flex items-start gap-3 rounded-2xl border border-line px-4 py-3">
                <span
                  className={`mt-2 size-2 shrink-0 rounded-full ${languageStyle(card.language).bg}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p lang={card.language} className="font-serif leading-snug">
                    {card.corrected}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {card.category && `${CORRECTION_CATEGORY_LABELS[card.category]} · `}
                    Révision {relativeDueLabel(card.review.dueOn, today)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(card)}
                  aria-label={`Retirer « ${card.corrected} » des erreurs à revoir`}
                  className="shrink-0 text-xs font-medium text-muted hover:text-danger"
                >
                  Retirer
                </button>
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}

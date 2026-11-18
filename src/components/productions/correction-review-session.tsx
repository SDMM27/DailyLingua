"use client";

import { useState } from "react";
import { buttonClass, Card, Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { applyReview, relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { DateKey } from "@/lib/schemas/common";
import type { CorrectionCard } from "@/lib/schemas/correction-card";
import type { ReviewGrade } from "@/lib/schemas/vocabulary";
import { CORRECTION_CATEGORY_LABELS } from "@/lib/schemas/writing-feedback";

const GRADES: { grade: ReviewGrade; label: string; tone: string }[] = [
  { grade: "again", label: "À revoir", tone: "border-danger/40 text-danger" },
  { grade: "hard", label: "Difficile", tone: "border-line text-ink-soft" },
  { grade: "good", label: "Bien", tone: "border-line text-ink" },
  { grade: "easy", label: "Facile", tone: "border-success/40 text-success" },
];

/**
 * Review of the correction cards due today: the faulty passage is shown, the learner may write
 * their own version (not graded, not saved), then sees the correction and grades themselves.
 * `queue` is fixed when the session starts.
 */
export function CorrectionReviewSession({
  queue,
  today,
  onReviewed,
}: {
  queue: CorrectionCard[];
  today: DateKey;
  onReviewed: (card: CorrectionCard, grade: ReviewGrade) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState("");

  if (queue.length === 0) {
    return (
      <Card>
        <Eyebrow>Révisions du jour</Eyebrow>
        <p className="mt-2 font-serif text-xl italic">Aucune erreur à revoir aujourd’hui.</p>
      </Card>
    );
  }

  if (index >= queue.length) {
    return (
      <Card className="text-center">
        <Eyebrow>Révisions du jour</Eyebrow>
        <p className="mt-2 font-serif text-xl font-semibold">
          Terminé : {queue.length} erreur{queue.length > 1 ? "s" : ""} revue{queue.length > 1 ? "s" : ""}
        </p>
        <p className="mt-1 text-sm text-ink-soft">Les prochaines dates sont visibles dans la liste.</p>
      </Card>
    );
  }

  const card = queue[index];
  const grade = (g: ReviewGrade) => {
    onReviewed(card, g);
    setRevealed(false);
    setAttempt("");
    setIndex((i) => i + 1);
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Révisions du jour</Eyebrow>
        <span className="kicker text-muted">
          {index + 1} / {queue.length}
        </span>
      </div>
      <ProgressBar value={index / queue.length} label="Progression des révisions" className="mt-3" />

      <div className="py-6">
        <div className="flex items-center gap-2">
          <LanguageTag language={card.language} />
          {card.category && (
            <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              {CORRECTION_CATEGORY_LABELS[card.category]}
            </span>
          )}
        </div>
        <p className="kicker mt-4 text-muted">Passage à corriger</p>
        <p lang={card.language} className="sd-display mt-1 text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.15] text-balance">
          {card.original}
        </p>

        {revealed ? (
          <div className="mt-5 space-y-3" aria-live="polite">
            <div>
              <p className="kicker text-muted">Correction</p>
              <p lang={card.language} className="mt-1 font-serif text-2xl font-bold text-success">
                {card.corrected}
              </p>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-soft">{card.explanation}</p>
            {attempt.trim() && (
              <div>
                <p className="kicker text-muted">Ta version</p>
                <p lang={card.language} className="mt-1 font-serif text-lg whitespace-pre-wrap">
                  {attempt}
                </p>
              </div>
            )}
          </div>
        ) : (
          <label className="mt-5 block">
            <span className="kicker text-muted">Ta version (facultatif)</span>
            <textarea
              lang={card.language}
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              rows={2}
              maxLength={400}
              className="mt-1 block w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 font-serif text-base"
            />
          </label>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map(({ grade: g, label, tone }) => (
            <button
              key={g}
              type="button"
              onClick={() => grade(g)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-full border bg-surface px-2 py-2 transition-colors hover:bg-surface-sunk ${tone}`}
            >
              <span className="text-[13px] font-semibold">{label}</span>
              <span className="font-mono text-[10px] text-muted">
                {relativeDueLabel(applyReview(card.review, g, today).dueOn, today)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className={`${buttonClass.primary} w-full !min-h-12`}
        >
          Voir la correction
        </button>
      )}
    </Card>
  );
}

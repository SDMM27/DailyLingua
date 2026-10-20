"use client";

import { useState } from "react";
import { Card, Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { applyReview, relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { DateKey } from "@/lib/schemas/common";
import type { ReviewGrade, VocabularyItem, VocabularyList } from "@/lib/schemas/vocabulary";

const GRADES: { grade: ReviewGrade; label: string; tone: string }[] = [
  { grade: "again", label: "À revoir", tone: "border-danger/40 text-danger" },
  { grade: "hard", label: "Difficile", tone: "border-line text-ink-soft" },
  { grade: "good", label: "Bien", tone: "border-line text-ink" },
  { grade: "easy", label: "Facile", tone: "border-success/40 text-success" },
];

/** Flashcard review of the words due today. `queue` is fixed when the session starts. */
export function ReviewSession({
  queue,
  lists,
  today,
  onReviewed,
}: {
  queue: VocabularyItem[];
  lists: VocabularyList[];
  today: DateKey;
  onReviewed: (item: VocabularyItem, grade: ReviewGrade) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (queue.length === 0) {
    return (
      <Card>
        <Eyebrow>Révisions du jour</Eyebrow>
        <p className="mt-2 font-serif text-lg">Aucun mot à revoir aujourd’hui.</p>
      </Card>
    );
  }

  if (index >= queue.length) {
    return (
      <Card className="text-center">
        <Eyebrow>Révisions du jour</Eyebrow>
        <p className="mt-2 font-serif text-xl font-semibold">Terminé : {queue.length} mots revus</p>
        <p className="mt-1 text-sm text-ink-soft">Les prochaines dates sont visibles dans la liste.</p>
      </Card>
    );
  }

  const item = queue[index];
  const listName = lists.find((list) => list.id === item.listId)?.name;
  const grade = (g: ReviewGrade) => {
    onReviewed(item, g);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Révisions du jour</Eyebrow>
        <span className="text-xs font-medium text-muted">
          {index + 1} / {queue.length}
        </span>
      </div>
      <ProgressBar value={index / queue.length} label="Progression des révisions" className="mt-3" />

      <div className="flex min-h-44 flex-col items-center justify-center py-6 text-center">
        <LanguageTag language={item.language} />
        {listName && <p className="mt-1.5 text-xs text-muted">Liste : {listName}</p>}
        <p lang={item.language} className="mt-4 font-serif text-3xl font-semibold text-balance">
          {item.term}
        </p>
        {revealed && (
          <div className="mt-4 space-y-1.5" aria-live="polite">
            <p className="text-lg">{item.translation}</p>
            {item.definition && (
              <p lang={item.language} className="text-sm text-ink-soft">
                {item.definition}
              </p>
            )}
            {item.example && (
              <p lang={item.language} className="font-serif-italic text-[15px] text-ink-soft italic">
                {item.example}
              </p>
            )}
          </div>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(({ grade: g, label, tone }) => (
            <button
              key={g}
              type="button"
              onClick={() => grade(g)}
              className={`flex flex-col items-center rounded-2xl border bg-surface px-1 py-2.5 transition-colors hover:bg-surface-sunk ${tone}`}
            >
              <span className="text-[13px] font-semibold">{label}</span>
              <span className="text-[10px] text-muted">
                {relativeDueLabel(applyReview(item.review, g, today).dueOn, today)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]"
        >
          Afficher la réponse
        </button>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { addWord, deleteWord, reviewWord, setWordStatus } from "@/app/actions/vocabulary";
import { PlusIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { languageInfo } from "@/lib/domain/languages";
import {
  applyReview,
  dueToday,
  initialReviewState,
  relativeDueLabel,
} from "@/lib/domain/spaced-repetition";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { NewVocabularyInput, ReviewGrade, VocabularyItem } from "@/lib/schemas/vocabulary";
import { AddWordForm } from "./add-word-form";
import { ReviewSession } from "./review-session";

type StatusFilter = "learning" | "known" | "all";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "learning", label: "À apprendre" },
  { value: "known", label: "Connus" },
  { value: "all", label: "Tous" },
];

/**
 * Vocabulary list and review. Changes are applied on screen at once and saved by server actions;
 * a change the server refuses is rolled back and reported. `persist` is false in the demo, where
 * changes only live in memory.
 */
export function VocabularyView({
  initialItems,
  languages,
  today,
  persist,
}: {
  initialItems: VocabularyItem[];
  languages: Language[];
  today: DateKey;
  persist: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  // The review queue is fixed at load so grading a word doesn't reshuffle the session.
  const [reviewQueue] = useState(() => dueToday(initialItems, today));
  const [languageFilter, setLanguageFilter] = useState<Language | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("learning");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, change: (item: VocabularyItem) => VocabularyItem) =>
    setItems((list) => list.map((item) => (item.id === id ? change(item) : item)));

  const handleReviewed = async (reviewed: VocabularyItem, grade: ReviewGrade) => {
    const before = reviewed.review;
    update(reviewed.id, (item) => ({ ...item, review: applyReview(item.review, grade, today) }));
    if (!persist) return;
    const result = await reviewWord({ id: reviewed.id, grade, expectedReviewCount: before.reviewCount });
    if (result.ok) {
      update(reviewed.id, (item) => ({ ...item, review: result.data.review }));
      setError(null);
    } else {
      update(reviewed.id, (item) => ({ ...item, review: before }));
      setError(`« ${reviewed.term} » n’a pas été enregistré : ${result.error}`);
    }
  };

  /** Resolves to an error message for the form, or null once the word is added. */
  const handleAdd = async (input: NewVocabularyInput): Promise<string | null> => {
    let item: VocabularyItem;
    if (persist) {
      const result = await addWord(input);
      if (!result.ok) return result.error;
      item = result.data;
    } else {
      item = {
        id: `local-${Date.now().toString(36)}`,
        language: input.language,
        term: input.term,
        translation: input.translation,
        definition: input.definition,
        example: input.example,
        source: input.sourceName ? { name: input.sourceName } : undefined,
        status: "learning",
        review: initialReviewState(today),
        addedOn: today,
      };
    }
    setItems((list) => [item, ...list]);
    setAdding(false);
    setStatusFilter("learning");
    setError(null);
    return null;
  };

  const handleToggleKnown = async (item: VocabularyItem) => {
    const status = item.status === "known" ? "learning" : "known";
    update(item.id, (i) => ({ ...i, status }));
    if (!persist) return;
    const result = await setWordStatus({ id: item.id, status });
    if (result.ok) return setError(null);
    update(item.id, (i) => ({ ...i, status: item.status }));
    setError(result.error);
  };

  const handleDelete = async (item: VocabularyItem) => {
    if (persist) {
      const result = await deleteWord({ id: item.id });
      if (!result.ok) return setError(result.error);
    }
    setItems((list) => list.filter((i) => i.id !== item.id));
    setError(null);
  };

  const visible = items
    .filter((i) => languageFilter === "all" || i.language === languageFilter)
    .filter((i) => statusFilter === "all" || i.status === statusFilter)
    .sort((a, b) => a.review.dueOn.localeCompare(b.review.dueOn));

  return (
    <div className="space-y-10">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ReviewSession queue={reviewQueue} today={today} onReviewed={handleReviewed} />

      <section>
        <SectionTitle
          action={
            !adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-paper"
              >
                <PlusIcon width={15} height={15} />
                Ajouter
              </button>
            )
          }
        >
          Mes mots
        </SectionTitle>

        {adding && (
          <Card className="mb-5">
            <AddWordForm languages={languages} onAdd={handleAdd} onCancel={() => setAdding(false)} />
          </Card>
        )}

        <div className="mb-4 space-y-2">
          <FilterRow
            label="Langue"
            options={[
              { value: "all" as const, label: "Toutes" },
              ...languages.map((l) => ({ value: l, label: languageInfo(l).nameFr })),
            ]}
            value={languageFilter}
            onChange={setLanguageFilter}
          />
          <FilterRow label="Statut" options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Aucun mot dans cette sélection.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <WordCard
                key={item.id}
                item={item}
                today={today}
                onToggleKnown={() => handleToggleKnown(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === o.value ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:bg-surface-sunk"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function WordCard({
  item,
  today,
  onToggleKnown,
  onDelete,
}: {
  item: VocabularyItem;
  today: DateKey;
  onToggleKnown: () => void;
  onDelete: () => void;
}) {
  const style = languageStyle(item.language);
  const known = item.status === "known";
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <li className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`mt-2.5 size-2 shrink-0 rounded-full ${style.bg}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p lang={item.language} className="font-serif text-lg font-semibold">
            {item.term}
          </p>
          <p className="text-sm text-ink-soft">{item.translation}</p>
          {item.definition && (
            <p lang={item.language} className="mt-1.5 text-[13px] text-ink-soft">
              {item.definition}
            </p>
          )}
          {item.example && (
            <p lang={item.language} className="mt-1.5 font-serif-italic text-[15px] text-ink-soft italic">
              {item.example}
            </p>
          )}
          <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {item.source && <span>{item.source.name}</span>}
            {!known && <span>Révision {relativeDueLabel(item.review.dueOn, today)}</span>}
            <span>Boîte {item.review.box}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleKnown}
          aria-pressed={known}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            known ? "border-success/40 bg-success-soft text-success" : "border-line text-ink-soft hover:bg-surface-sunk"
          }`}
        >
          {known ? "Connu" : "Marquer connu"}
        </button>
      </div>
      <div className="mt-2 flex justify-end gap-3 text-xs font-medium">
        {confirmingDelete ? (
          <>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="text-muted">
              Annuler
            </button>
            <button type="button" onClick={onDelete} className="text-danger">
              Confirmer la suppression
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Supprimer « ${item.term} »`}
            className="text-muted hover:text-danger"
          >
            Supprimer
          </button>
        )}
      </div>
    </li>
  );
}

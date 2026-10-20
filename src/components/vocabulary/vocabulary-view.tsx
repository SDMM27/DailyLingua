"use client";

import { useRef, useState } from "react";
import {
  addWord,
  createList,
  deleteList,
  deleteWord,
  importWords,
  reviewWord,
  setWordStatus,
  translateWords,
  updateList,
} from "@/app/actions/vocabulary";
import type { ActionResult } from "@/app/actions/result";
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
import { normalizeTermKey } from "@/lib/domain/vocabulary-import";
import type { DateKey, Language } from "@/lib/schemas/common";
import type {
  ImportVocabularyInput,
  ImportVocabularyResult,
  NewVocabularyInput,
  NewVocabularyListInput,
  ReviewGrade,
  VocabularyItem,
  VocabularyList,
} from "@/lib/schemas/vocabulary";
import { AddWordForm } from "./add-word-form";
import { ImportWordsForm } from "./import-words-form";
import { ListsSection } from "./lists-section";
import { ReviewSession } from "./review-session";

type StatusFilter = "learning" | "known" | "all";
/** "all", "none" (words without a list), or the id of a list. */
type ListFilter = string;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "learning", label: "À apprendre" },
  { value: "known", label: "Connus" },
  { value: "all", label: "Tous" },
];

/** Id of a list or word created in memory (demo): never sent to the server. */
const localId = (prefix: string, suffix: string | number = "") => `${prefix}-${Date.now().toString(36)}${suffix}`;

/**
 * Vocabulary lists, list and review. Changes are applied on screen at once and saved by server
 * actions; a change the server refuses is rolled back and reported. `persist` is false in the
 * demo, where changes only live in memory.
 */
export function VocabularyView({
  initialItems,
  initialLists,
  languages,
  today,
  persist,
  canTranslate,
  isGuest,
}: {
  initialItems: VocabularyItem[];
  initialLists: VocabularyList[];
  languages: Language[];
  today: DateKey;
  persist: boolean;
  /** Automatic translation of imported words is on for this server. */
  canTranslate: boolean;
  isGuest: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [lists, setLists] = useState(initialLists);
  // The review queue is fixed when a session starts so grading a word doesn't reshuffle it; it is
  // rebuilt (and the session restarted) when the set of words to review changes: a list paused,
  // deleted, or words imported.
  const [reviewListId, setReviewListId] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState(() => dueToday(initialItems, today, initialLists));
  const [reviewKey, setReviewKey] = useState(0);
  const reviewRef = useRef<HTMLDivElement>(null);
  const [languageFilter, setLanguageFilter] = useState<Language | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("learning");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [panel, setPanel] = useState<"add" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, change: (item: VocabularyItem) => VocabularyItem) =>
    setItems((list) => list.map((item) => (item.id === id ? change(item) : item)));

  const restartReview = (nextItems: VocabularyItem[], nextLists: VocabularyList[], listId: string | null) => {
    setReviewListId(listId);
    setReviewQueue(dueToday(nextItems, today, nextLists).filter((item) => listId === null || item.listId === listId));
    setReviewKey((key) => key + 1);
  };

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
        id: localId("local"),
        language: input.language,
        term: input.term,
        translation: input.translation,
        definition: input.definition,
        example: input.example,
        source: input.sourceName ? { name: input.sourceName } : undefined,
        status: "learning",
        review: initialReviewState(today),
        addedOn: today,
        listId: input.listId,
      };
    }
    setItems((list) => [item, ...list]);
    setPanel(null);
    setStatusFilter("learning");
    setError(null);
    return null;
  };

  /** Adds the words of an import; in the demo they only exist in memory. */
  const handleImport = async (input: ImportVocabularyInput): Promise<ActionResult<ImportVocabularyResult>> => {
    let result: ImportVocabularyResult;
    if (persist) {
      const response = await importWords(input);
      if (!response.ok) return response;
      result = response.data;
    } else {
      const taken = new Set(items.filter((i) => i.language === input.language).map((i) => normalizeTermKey(i.term)));
      const entries = input.entries.filter((entry) => !taken.has(normalizeTermKey(entry.term)));
      const list: VocabularyList | undefined = input.newListName
        ? { id: localId("local-list"), language: input.language, name: input.newListName, active: true }
        : undefined;
      result = {
        added: entries.map((entry, index) => ({
          id: localId("local", `-${index}`),
          language: input.language,
          term: entry.term,
          translation: entry.translation,
          example: entry.example,
          status: "learning",
          review: initialReviewState(today),
          addedOn: today,
          listId: list?.id ?? input.listId,
        })),
        skipped: input.entries.filter((entry) => !entries.includes(entry)).map((entry) => entry.term),
        list,
      };
    }
    const nextItems = [...result.added, ...items];
    const nextLists = result.list ? [...lists, result.list] : lists;
    setItems(nextItems);
    setLists(nextLists);
    restartReview(nextItems, nextLists, reviewListId);
    setStatusFilter("learning");
    setError(null);
    return { ok: true, data: result };
  };

  /** Resolves to an error message for the form, or null once the list is created. */
  const handleCreateList = async (input: NewVocabularyListInput): Promise<string | null> => {
    let list: VocabularyList;
    if (persist) {
      const result = await createList(input);
      if (!result.ok) return result.error;
      list = result.data;
    } else {
      if (lists.some((l) => l.name === input.name)) return "Tu as déjà une liste de ce nom.";
      list = { id: localId("local-list"), language: input.language, name: input.name, description: input.description, active: true };
    }
    setLists((all) => [...all, list]);
    setError(null);
    return null;
  };

  const handleToggleList = async (list: VocabularyList) => {
    const active = !list.active;
    const withActive = (value: boolean) => lists.map((l) => (l.id === list.id ? { ...l, active: value } : l));
    setLists(withActive(active));
    restartReview(items, withActive(active), reviewListId);
    if (!persist) return;
    const result = await updateList({ id: list.id, active });
    if (result.ok) return setError(null);
    setLists(withActive(list.active));
    restartReview(items, withActive(list.active), reviewListId);
    setError(result.error);
  };

  const handleDeleteList = async (list: VocabularyList) => {
    if (persist) {
      const result = await deleteList({ id: list.id });
      if (!result.ok) return setError(result.error);
    }
    const nextLists = lists.filter((l) => l.id !== list.id);
    const nextItems = items.filter((i) => i.listId !== list.id);
    setLists(nextLists);
    setItems(nextItems);
    if (listFilter === list.id) setListFilter("all");
    restartReview(nextItems, nextLists, reviewListId === list.id ? null : reviewListId);
    setError(null);
  };

  const handleReviewList = (list: VocabularyList) => {
    restartReview(items, lists, list.id);
    reviewRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
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

  const dueCounts = new Map<string, number>();
  for (const item of dueToday(items, today, lists)) {
    if (item.listId) dueCounts.set(item.listId, (dueCounts.get(item.listId) ?? 0) + 1);
  }
  const reviewList = lists.find((l) => l.id === reviewListId);

  const visible = items
    .filter((i) => languageFilter === "all" || i.language === languageFilter)
    .filter((i) => statusFilter === "all" || i.status === statusFilter)
    .filter((i) => listFilter === "all" || (listFilter === "none" ? i.listId === undefined : i.listId === listFilter))
    .sort((a, b) => a.review.dueOn.localeCompare(b.review.dueOn));

  return (
    <div className="space-y-10">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div ref={reviewRef} className="scroll-mt-4 space-y-2">
        {reviewList && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink-soft">Liste : {reviewList.name}</span>
            <button
              type="button"
              onClick={() => restartReview(items, lists, null)}
              className="font-medium text-ink underline"
            >
              Réviser tous les mots du jour
            </button>
          </div>
        )}
        <ReviewSession key={reviewKey} queue={reviewQueue} lists={lists} today={today} onReviewed={handleReviewed} />
      </div>

      <ListsSection
        lists={lists}
        items={items}
        dueCounts={dueCounts}
        languages={languages}
        onCreate={handleCreateList}
        onReview={handleReviewList}
        onToggle={handleToggleList}
        onDelete={handleDeleteList}
      />

      <section>
        <SectionTitle
          action={
            panel === null && (
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPanel("import")}
                  className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
                >
                  Importer
                </button>
                <button
                  type="button"
                  onClick={() => setPanel("add")}
                  className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-paper"
                >
                  <PlusIcon width={15} height={15} />
                  Ajouter
                </button>
              </span>
            )
          }
        >
          Mes mots
        </SectionTitle>

        {panel === "add" && (
          <Card className="mb-5">
            <AddWordForm languages={languages} lists={lists} onAdd={handleAdd} onCancel={() => setPanel(null)} />
          </Card>
        )}
        {panel === "import" && (
          <Card className="mb-5">
            <ImportWordsForm
              languages={languages}
              lists={lists}
              items={items}
              canTranslate={canTranslate}
              isGuest={isGuest}
              onImport={handleImport}
              onTranslate={translateWords}
              onClose={() => setPanel(null)}
            />
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
          {lists.length > 0 && (
            <FilterRow
              label="Liste"
              options={[
                { value: "all", label: "Toutes" },
                { value: "none", label: "Sans liste" },
                ...lists.map((l) => ({ value: l.id, label: l.name })),
              ]}
              value={listFilter}
              onChange={setListFilter}
            />
          )}
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Aucun mot dans cette sélection.</p>
        ) : (
          <ul aria-label="Mes mots" className="space-y-3">
            {visible.map((item) => (
              <WordCard
                key={item.id}
                item={item}
                listName={lists.find((l) => l.id === item.listId)?.name}
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
  listName,
  today,
  onToggleKnown,
  onDelete,
}: {
  item: VocabularyItem;
  listName?: string;
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
            {listName && <span>Liste : {listName}</span>}
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

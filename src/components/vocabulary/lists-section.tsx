"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { buttonClass, SectionTitle } from "@/components/ui/primitives";
import { languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";
import {
  newVocabularyListInputSchema,
  type NewVocabularyListInput,
  type VocabularyItem,
  type VocabularyList,
} from "@/lib/schemas/vocabulary";

const inputClass =
  "w-full rounded-xl border border-line bg-surface min-h-11 px-3.5 py-2.5 text-base placeholder:text-muted focus:border-ink-soft focus:outline-none";

/** "Mes listes": one card per list with its counts and actions, and the form to create an empty list. */
export function ListsSection({
  lists,
  items,
  dueCounts,
  languages,
  onCreate,
  onReview,
  onToggle,
  onDelete,
}: {
  lists: VocabularyList[];
  items: VocabularyItem[];
  /** Words to review today, by list id (paused lists count for nothing). */
  dueCounts: ReadonlyMap<string, number>;
  languages: Language[];
  /** Resolves to an error message to show in the form, or null when the list was created. */
  onCreate: (input: NewVocabularyListInput) => Promise<string | null>;
  onReview: (list: VocabularyList) => void;
  onToggle: (list: VocabularyList) => void;
  onDelete: (list: VocabularyList) => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <SectionTitle
        action={
          !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={`${buttonClass.secondary} !px-4 text-sm`}
            >
              <PlusIcon width={15} height={15} />
              Nouvelle liste
            </button>
          )
        }
      >
        Mes listes
      </SectionTitle>

      {creating && (
        <div className="mb-5 border-y border-ink py-5">
          <NewListForm
            languages={languages}
            onCreate={async (input) => {
              const error = await onCreate(input);
              if (!error) setCreating(false);
              return error;
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {lists.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          Aucune liste pour l’instant. Importe les mots d’un livre ou d’un cours, ou crée une liste vide.
        </p>
      ) : (
        <ul aria-label="Mes listes" className="border-b border-line">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              wordCount={items.filter((i) => i.listId === list.id).length}
              dueCount={dueCounts.get(list.id) ?? 0}
              onReview={() => onReview(list)}
              onToggle={() => onToggle(list)}
              onDelete={() => onDelete(list)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ListCard({
  list,
  wordCount,
  dueCount,
  onReview,
  onToggle,
  onDelete,
}: {
  list: VocabularyList;
  wordCount: number;
  dueCount: number;
  onReview: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const style = languageStyle(list.language);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const words = `${wordCount} mot${wordCount > 1 ? "s" : ""}`;
  return (
    <li className="border-t border-line py-4">
      <div className="flex items-start gap-3">
        <span className={`mt-3 size-2 shrink-0 rounded-full ${style.bg}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xl font-bold break-words">{list.name}</p>
          {list.description && <p className="text-sm text-ink-soft">{list.description}</p>}
          <p className="kicker mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-muted">
            <span>{languageInfo(list.language).nameFr}</span>
            <span>{words}</span>
            {list.active ? <span>{dueCount} à revoir</span> : <span className="font-semibold text-ink-soft">En pause</span>}
          </p>
        </div>
      </div>

      {confirmingDelete ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs font-medium">
          <span className="text-ink-soft">
            Supprimer « {list.name} » et ses {wordCount} mots ?
          </span>
          <button type="button" onClick={() => setConfirmingDelete(false)} className="min-h-11 px-2 text-muted">
            Annuler
          </button>
          <button type="button" onClick={onDelete} className="min-h-11 px-2 text-danger">
            Confirmer la suppression de la liste
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={onReview}
            disabled={!list.active || dueCount === 0}
            aria-label={`Réviser « ${list.name} »`}
            className={`${buttonClass.primary} !px-4 text-sm`}
          >
            Réviser
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={`${list.active ? "Mettre en pause" : "Réactiver"} « ${list.name} »`}
            className={`${buttonClass.secondary} !px-4 text-sm`}
          >
            {list.active ? "Mettre en pause" : "Réactiver"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Supprimer la liste « ${list.name} »`}
            className="min-h-11 px-2 text-muted hover:text-danger"
          >
            Supprimer
          </button>
        </div>
      )}
    </li>
  );
}

function NewListForm({
  languages,
  onCreate,
  onCancel,
}: {
  languages: Language[];
  onCreate: (input: NewVocabularyListInput) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "").trim();
    const parsed = newVocabularyListInputSchema.safeParse({
      language: data.get("language"),
      name: data.get("name"),
      description: description === "" ? undefined : description,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Données invalides.");
    setError(null);
    setPending(true);
    const failure = await onCreate(parsed.data);
    setPending(false);
    if (failure) setError(failure);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex gap-2" role="radiogroup" aria-label="Langue de la liste">
        {languages.map((lang, i) => (
          <label key={lang} className="flex-1">
            <input type="radio" name="language" value={lang} defaultChecked={i === 0} className="peer sr-only" />
            <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line text-center text-sm font-medium text-ink-soft transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
              {languageInfo(lang).nameFr}
            </span>
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Nom de la liste</span>
        <input name="name" autoComplete="off" maxLength={80} placeholder="ex. Le Petit Prince, cours du jeudi" className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Description (facultatif)</span>
        <input name="description" autoComplete="off" maxLength={300} className={inputClass} />
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className={`${buttonClass.secondary} flex-1`}>
          Annuler
        </button>
        <button type="submit" disabled={pending} className={`${buttonClass.primary} flex-1`}>
          Créer la liste
        </button>
      </div>
    </form>
  );
}

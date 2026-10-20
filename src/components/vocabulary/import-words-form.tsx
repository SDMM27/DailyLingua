"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActionResult } from "@/app/actions/result";
import { languageInfo } from "@/lib/domain/languages";
import { markExisting, parseVocabularyPaste, type ParseError } from "@/lib/domain/vocabulary-import";
import type { Language } from "@/lib/schemas/common";
import {
  VOCABULARY_IMPORT_LIMITS,
  VOCABULARY_TRANSLATION_LIMITS,
  importVocabularyInputSchema,
  type ImportVocabularyInput,
  type ImportVocabularyResult,
  type TranslateVocabularyInput,
  type VocabularyItem,
  type VocabularyList,
  type VocabularyTranslationResult,
} from "@/lib/schemas/vocabulary";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 placeholder:text-muted focus:border-ink-soft focus:outline-none";

/** Value of the "list" select for "a new list" (list ids are uuids, they never collide with it). */
const NEW_LIST = "__new";

type Step = "paste" | "preview" | "done";

interface Row {
  line: number;
  term: string;
  translation: string;
  example: string;
  checked: boolean;
  /** The user already has this word: it is not imported. */
  existing: boolean;
  /** Filled in by the model and not edited since: to be checked by the user. */
  suggestion: "suggested" | "uncertain" | null;
}

/**
 * Import of many words from a paste, in two steps: paste and choose the list, then check the
 * preview (each kept word needs a translation, typed or suggested by the model) before saving.
 * Nothing is saved until the last button.
 */
export function ImportWordsForm({
  languages,
  lists,
  items,
  canTranslate,
  isGuest,
  onImport,
  onTranslate,
  onClose,
}: {
  languages: Language[];
  lists: VocabularyList[];
  /** The user's words, to spot the ones they already have. */
  items: VocabularyItem[];
  /** The automatic translation is on for this server. */
  canTranslate: boolean;
  isGuest: boolean;
  onImport: (input: ImportVocabularyInput) => Promise<ActionResult<ImportVocabularyResult>>;
  onTranslate: (input: TranslateVocabularyInput) => Promise<ActionResult<VocabularyTranslationResult>>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("paste");
  const [language, setLanguage] = useState<Language>(languages[0]);
  const [target, setTarget] = useState("");
  const [newListName, setNewListName] = useState("");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [lineErrors, setLineErrors] = useState<ParseError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [outcome, setOutcome] = useState<{ added: number; present: number; listName?: string } | null>(null);

  const languageLists = lists.filter((list) => list.language === language);
  const kept = rows.filter((row) => row.checked && !row.existing);
  const missing = kept.filter((row) => row.translation.trim() === "");
  const alreadyThere = rows.filter((row) => row.existing).length;

  function chooseLanguage(next: Language) {
    setLanguage(next);
    if (target !== "" && target !== NEW_LIST && !lists.some((l) => l.id === target && l.language === next)) setTarget("");
  }

  function analyse() {
    const parsed = parseVocabularyPaste(text);
    if (parsed.entries.length === 0 && parsed.errors.length === 0) return setFormError("Colle au moins un mot.");
    if (target === NEW_LIST) {
      const name = newListName.trim();
      if (name === "") return setFormError("Le nom de la liste est obligatoire");
      if (lists.some((list) => list.name === name)) return setFormError("Tu as déjà une liste de ce nom.");
    }
    setRows(
      markExisting(parsed.entries, items, language).map((entry) => ({
        line: entry.line,
        term: entry.term,
        translation: entry.translation ?? "",
        example: entry.example ?? "",
        checked: !entry.existing,
        existing: entry.existing,
        suggestion: null,
      })),
    );
    setLineErrors(parsed.errors);
    setFormError(null);
    setNotice(null);
    setStep("preview");
  }

  const updateRow = (line: number, change: Partial<Row>) =>
    setRows((list) => list.map((row) => (row.line === line ? { ...row, ...change } : row)));

  async function translate() {
    const batch = missing.slice(0, VOCABULARY_TRANSLATION_LIMITS.termsPerRequest);
    setTranslating(true);
    setNotice(null);
    const result = await onTranslate({ language, terms: batch.map((row) => row.term) });
    setTranslating(false);
    if (!result.ok) return setNotice(result.error);

    switch (result.data.status) {
      case "ready": {
        const byTerm = new Map(result.data.translations.map((t) => [t.term, t]));
        setRows((list) =>
          list.map((row) => {
            const suggestion = byTerm.get(row.term);
            if (!suggestion || row.translation.trim() !== "") return row;
            return { ...row, translation: suggestion.translation, suggestion: suggestion.uncertain ? "uncertain" : "suggested" };
          }),
        );
        const without = batch.filter((row) => !byTerm.has(row.term)).length;
        setNotice(without > 0 ? `${without} mot${without > 1 ? "s" : ""} sans suggestion : tape la traduction toi-même.` : null);
        return;
      }
      case "limit":
        return setNotice(
          `Tu as atteint la limite de ${VOCABULARY_TRANSLATION_LIMITS.termsPerDay} traductions automatiques pour aujourd’hui. Tape les traductions toi-même ou reviens demain.`,
        );
      case "guest":
        return setNotice("La traduction automatique est réservée aux comptes complets.");
      default:
        return setNotice("La traduction automatique est indisponible pour le moment. Tape les traductions toi-même.");
    }
  }

  async function save() {
    const parsed = importVocabularyInputSchema.safeParse({
      language,
      listId: target !== "" && target !== NEW_LIST ? target : undefined,
      newListName: target === NEW_LIST ? newListName.trim() : undefined,
      entries: kept.map((row) => ({
        term: row.term,
        translation: row.translation,
        example: row.example.trim() === "" ? undefined : row.example,
      })),
    });
    if (!parsed.success) return setFormError(parsed.error.issues[0]?.message ?? "Données invalides.");
    setFormError(null);
    setPending(true);
    const result = await onImport(parsed.data);
    setPending(false);
    if (!result.ok) return setFormError(result.error);
    setOutcome({
      added: result.data.added.length,
      present: alreadyThere + result.data.skipped.length,
      listName: result.data.list?.name ?? lists.find((list) => list.id === target)?.name,
    });
    setStep("done");
  }

  if (step === "done" && outcome) {
    const { added, present, listName } = outcome;
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
          {added} mot{added > 1 ? "s" : ""} ajouté{added > 1 ? "s" : ""}, {present} déjà présent{present > 1 ? "s" : ""}
          {listName ? ` · liste « ${listName} »` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setText("");
              setRows([]);
              setOutcome(null);
              setStep("paste");
            }}
            className="flex-1 rounded-2xl border border-line py-3 font-semibold text-ink-soft"
          >
            Importer d’autres mots
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-ink py-3 font-semibold text-paper">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          {rows.length} mot{rows.length > 1 ? "s" : ""} reconnu{rows.length > 1 ? "s" : ""}
          {lineErrors.length > 0 && ` · ${lineErrors.length} ligne${lineErrors.length > 1 ? "s" : ""} ignorée${lineErrors.length > 1 ? "s" : ""}`}
          . Vérifie les traductions avant d’enregistrer.
        </p>

        {lineErrors.length > 0 && (
          <ul aria-label="Lignes ignorées" className="space-y-1 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {lineErrors.map((error) => (
              <li key={error.line}>
                Ligne {error.line} : {error.reason}
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <ul aria-label="Mots à importer" className="space-y-3">
            {rows.map((row) => (
              <li key={row.line} className="rounded-2xl border border-line p-3">
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    disabled={row.existing}
                    onChange={(event) => updateRow(row.line, { checked: event.target.checked })}
                    className="mt-1.5 size-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span lang={language} className="font-serif text-lg font-semibold break-words">
                      {row.term}
                    </span>
                    {row.existing && <span className="ml-2 text-xs text-muted">déjà dans tes mots</span>}
                  </span>
                </label>
                {!row.existing && (
                  <div className="mt-2 space-y-2 pl-7">
                    <input
                      aria-label={`Traduction de ${row.term}`}
                      value={row.translation}
                      onChange={(event) => updateRow(row.line, { translation: event.target.value, suggestion: null })}
                      placeholder="Traduction"
                      autoComplete="off"
                      className={inputClass}
                    />
                    {row.suggestion && (
                      <p className="text-xs font-medium text-ink-soft">
                        à vérifier{row.suggestion === "uncertain" && " · incertain"}
                      </p>
                    )}
                    <input
                      aria-label={`Exemple de ${row.term}`}
                      value={row.example}
                      onChange={(event) => updateRow(row.line, { example: event.target.value })}
                      placeholder="Exemple (facultatif)"
                      autoComplete="off"
                      className={inputClass}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {canTranslate && missing.length > 0 && (
          <div className="space-y-2">
            {isGuest ? (
              <p className="rounded-2xl bg-surface-sunk px-4 py-3 text-sm text-ink-soft">
                La traduction automatique est réservée aux comptes complets.{" "}
                <Link href="/creer-mon-compte" className="font-semibold underline">
                  Crée ton compte
                </Link>{" "}
                pour l’utiliser.
              </p>
            ) : (
              <button
                type="button"
                onClick={translate}
                disabled={translating}
                className="w-full rounded-2xl border border-line py-3 font-semibold text-ink-soft hover:bg-surface-sunk disabled:opacity-60"
              >
                {translating
                  ? "Traduction en cours…"
                  : `Traduire automatiquement (${Math.min(missing.length, VOCABULARY_TRANSLATION_LIMITS.termsPerRequest)})`}
              </button>
            )}
            {!isGuest && missing.length > VOCABULARY_TRANSLATION_LIMITS.termsPerRequest && (
              <p className="text-xs text-muted">
                {VOCABULARY_TRANSLATION_LIMITS.termsPerRequest} mots par demande : relance pour les suivants.
              </p>
            )}
          </div>
        )}
        {notice && (
          <p role="status" className="rounded-2xl bg-surface-sunk px-4 py-3 text-sm text-ink-soft">
            {notice}
          </p>
        )}
        {formError && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setStep("paste");
            }}
            className="flex-1 rounded-2xl border border-line py-3 font-semibold text-ink-soft"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || kept.length === 0 || missing.length > 0}
            className="flex-1 rounded-2xl bg-ink py-3 font-semibold text-paper disabled:opacity-60"
          >
            Enregistrer {kept.length} mot{kept.length > 1 ? "s" : ""}
          </button>
        </div>
        {missing.length > 0 && (
          <p className="text-center text-xs text-muted">
            Il manque la traduction de {missing.length} mot{missing.length > 1 ? "s" : ""} : complète-la ou décoche le mot.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        analyse();
      }}
      noValidate
      className="space-y-3"
    >
      <div className="flex gap-2" role="radiogroup" aria-label="Langue des mots">
        {languages.map((lang) => (
          <label key={lang} className="flex-1">
            <input
              type="radio"
              name="language"
              value={lang}
              checked={language === lang}
              onChange={() => chooseLanguage(lang)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer rounded-xl border border-line py-2 text-center text-sm font-medium text-ink-soft transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
              {languageInfo(lang).nameFr}
            </span>
          </label>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Liste</span>
        <select value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass}>
          <option value="">Aucune liste</option>
          {languageLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
          <option value={NEW_LIST}>Nouvelle liste…</option>
        </select>
      </label>
      {target === NEW_LIST && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Nom de la nouvelle liste</span>
          <input
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
            maxLength={80}
            autoComplete="off"
            className={inputClass}
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Mots à importer</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={"sbrigarsi ; se dépêcher ; Sbrigati!\na malapena ; à peine"}
          className={`${inputClass} font-mono`}
        />
      </label>
      <p className="text-xs text-muted">
        Un mot par ligne : <span className="font-mono">mot ; traduction ; exemple</span> (la traduction et l’exemple sont
        facultatifs). Tu peux aussi séparer par une tabulation, un signe = ou un tiret entouré d’espaces : un copier-coller
        depuis un tableur fonctionne. Les lignes vides et celles qui commencent par # sont ignorées.{" "}
        {VOCABULARY_IMPORT_LIMITS.entries} mots au plus par import.
      </p>

      {formError && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-line py-3 font-semibold text-ink-soft">
          Annuler
        </button>
        <button type="submit" className="flex-1 rounded-2xl bg-ink py-3 font-semibold text-paper">
          Analyser
        </button>
      </div>
    </form>
  );
}

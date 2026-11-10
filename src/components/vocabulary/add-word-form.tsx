"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/actions/result";
import { languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";
import {
  VOCABULARY_TRANSLATION_LIMITS,
  newVocabularyInputSchema,
  type NewVocabularyInput,
  type TranslateVocabularyInput,
  type VocabularyList,
  type VocabularyTranslationResult,
} from "@/lib/schemas/vocabulary";

type FieldErrors = Partial<Record<keyof NewVocabularyInput, string>>;

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 placeholder:text-muted focus:border-ink-soft focus:outline-none";

export function AddWordForm({
  languages,
  lists,
  canTranslate,
  isGuest,
  onAdd,
  onTranslate,
  onCancel,
}: {
  languages: Language[];
  /** The user's lists; only those of the chosen language are offered. */
  lists: VocabularyList[];
  /** The automatic translation is on for this server. */
  canTranslate: boolean;
  isGuest: boolean;
  /** Resolves to an error message to show in the form, or null when the word was added. */
  onAdd: (input: NewVocabularyInput) => Promise<string | null>;
  onTranslate: (input: TranslateVocabularyInput) => Promise<ActionResult<VocabularyTranslationResult>>;
  onCancel: () => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [language, setLanguage] = useState<Language>(languages[0]);
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  /** Filled in by the model and not edited since: to be checked by the user. */
  const [suggestion, setSuggestion] = useState<"suggested" | "uncertain" | null>(null);
  const [translating, setTranslating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const languageLists = lists.filter((list) => list.language === language);

  async function translate() {
    const word = term.trim();
    if (word === "") return;
    setTranslating(true);
    setNotice(null);
    const result = await onTranslate({ language, terms: [word] });
    setTranslating(false);
    if (!result.ok) return setNotice(result.error);

    switch (result.data.status) {
      case "ready": {
        const found = result.data.translations[0];
        if (!found) return setNotice("Pas de suggestion pour ce mot : tape la traduction toi-même.");
        setTranslation(found.translation);
        setSuggestion(found.uncertain ? "uncertain" : "suggested");
        setErrors((current) => ({ ...current, translation: undefined }));
        return;
      }
      case "limit":
        return setNotice(
          `Tu as atteint la limite de ${VOCABULARY_TRANSLATION_LIMITS.termsPerDay} traductions automatiques pour aujourd’hui. Tape la traduction toi-même ou reviens demain.`,
        );
      case "guest":
        return setNotice("La traduction automatique est réservée aux comptes complets.");
      default:
        return setNotice("La traduction automatique est indisponible pour le moment. Tape la traduction toi-même.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; // not available after the first await
    const data = new FormData(form);
    const optional = (key: string) => {
      const value = String(data.get(key) ?? "").trim();
      return value === "" ? undefined : value;
    };
    const result = newVocabularyInputSchema.safeParse({
      language: data.get("language"),
      term: data.get("term"),
      translation: data.get("translation"),
      definition: optional("definition"),
      example: optional("example"),
      sourceName: optional("sourceName"),
      listId: optional("listId"),
    });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof NewVocabularyInput;
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    const error = await onAdd(result.data);
    setPending(false);
    if (error) setFormError(error);
    else {
      form.reset();
      setLanguage(languages[0]);
      setTerm("");
      setTranslation("");
      setSuggestion(null);
      setNotice(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex gap-2" role="radiogroup" aria-label="Langue">
        {languages.map((lang, i) => (
          <label key={lang} className="flex-1">
            <input
              type="radio"
              name="language"
              value={lang}
              defaultChecked={i === 0}
              onChange={() => setLanguage(lang)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer rounded-xl border border-line py-2 text-center text-sm font-medium text-ink-soft transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
              {languageInfo(lang).nameFr}
            </span>
          </label>
        ))}
      </div>
      <Field label="Mot ou expression" error={errors.term}>
        <input
          name="term"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          className={inputClass}
        />
      </Field>
      <Field label="Traduction" error={errors.translation}>
        <input
          name="translation"
          value={translation}
          onChange={(event) => {
            setTranslation(event.target.value);
            setSuggestion(null);
          }}
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      {suggestion && (
        <p className="-mt-1 text-xs font-medium text-ink-soft">
          à vérifier{suggestion === "uncertain" && " · incertain"}
        </p>
      )}
      {canTranslate && !isGuest && (
        <button
          type="button"
          onClick={translate}
          disabled={translating || term.trim() === ""}
          className="w-full rounded-2xl border border-line py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk disabled:opacity-60"
        >
          {translating ? "Traduction en cours…" : "Traduire automatiquement"}
        </button>
      )}
      {notice && (
        <p role="status" className="rounded-2xl bg-surface-sunk px-4 py-3 text-sm text-ink-soft">
          {notice}
        </p>
      )}
      <Field label="Définition (facultatif)" error={errors.definition}>
        <input name="definition" autoComplete="off" className={inputClass} />
      </Field>
      <Field label="Exemple (facultatif)" error={errors.example}>
        <textarea name="example" rows={2} className={inputClass} />
      </Field>
      <Field label="Source (facultatif)" error={errors.sourceName}>
        <input name="sourceName" autoComplete="off" placeholder="ex. Meduza, Il Post…" className={inputClass} />
      </Field>
      {languageLists.length > 0 && (
        <Field label="Liste (facultatif)" error={errors.listId}>
          <select key={language} name="listId" defaultValue="" className={inputClass}>
            <option value="">Aucune liste</option>
            {languageLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {formError && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-line py-3 font-semibold text-ink-soft">
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-2xl bg-ink py-3 font-semibold text-paper disabled:opacity-60"
        >
          Ajouter
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
        {children}
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";
import { newVocabularyInputSchema, type NewVocabularyInput } from "@/lib/schemas/vocabulary";

type FieldErrors = Partial<Record<keyof NewVocabularyInput, string>>;

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 placeholder:text-muted focus:border-ink-soft focus:outline-none";

export function AddWordForm({
  languages,
  onAdd,
  onCancel,
}: {
  languages: Language[];
  onAdd: (input: NewVocabularyInput) => void;
  onCancel: () => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
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
    onAdd(result.data);
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex gap-2" role="radiogroup" aria-label="Langue">
        {languages.map((lang, i) => (
          <label key={lang} className="flex-1">
            <input type="radio" name="language" value={lang} defaultChecked={i === 0} className="peer sr-only" />
            <span className="block cursor-pointer rounded-xl border border-line py-2 text-center text-sm font-medium text-ink-soft transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
              {languageInfo(lang).nameFr}
            </span>
          </label>
        ))}
      </div>
      <Field label="Mot ou expression" error={errors.term}>
        <input name="term" autoComplete="off" autoCapitalize="none" className={inputClass} />
      </Field>
      <Field label="Traduction" error={errors.translation}>
        <input name="translation" autoComplete="off" className={inputClass} />
      </Field>
      <Field label="Définition (facultatif)" error={errors.definition}>
        <input name="definition" autoComplete="off" className={inputClass} />
      </Field>
      <Field label="Exemple (facultatif)" error={errors.example}>
        <textarea name="example" rows={2} className={inputClass} />
      </Field>
      <Field label="Source (facultatif)" error={errors.sourceName}>
        <input name="sourceName" autoComplete="off" placeholder="ex. Meduza, Il Post…" className={inputClass} />
      </Field>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-line py-3 font-semibold text-ink-soft">
          Annuler
        </button>
        <button type="submit" className="flex-1 rounded-2xl bg-ink py-3 font-semibold text-paper">
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

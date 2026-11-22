"use client";

import { maxKnownLanguages } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { saveKnownLanguageSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, FormMessage } from "@/components/ui/field";
import { filterLanguages, type LanguageOption } from "@/lib/languages";

export function KnownLanguagesPicker({ options, selected, onChange, disabled }: {
  options: LanguageOption[];
  selected: string[];
  onChange: (languages: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("knownLanguages");
  const [query, setQuery] = useState("");
  const visible = filterLanguages(options, query);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("hint")}</p>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((code) => {
            const name = options.find((option) => option.code === code)?.name ?? code;
            return (
              <li key={code}>
                <Button variant="secondary" className="px-3" disabled={disabled}
                  aria-label={t("remove", { name })} onClick={() => onChange(selected.filter((saved) => saved !== code))}>
                  {name} <span aria-hidden="true">×</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} disabled={disabled}
        aria-label={t("search")} placeholder={t("search")} autoComplete="off" className={CONTROL_CLASS} />
      {visible.length === 0 ? <p role="status" className="text-muted">{t("noResults")}</p> : (
        <ul className="max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-line">
          {visible.map(({ code, name }) => {
            const checked = selected.includes(code);
            return (
              <li key={code}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3">
                  <input type="checkbox" checked={checked} disabled={disabled || (!checked && selected.length >= maxKnownLanguages)}
                    onChange={() => onChange(checked ? selected.filter((saved) => saved !== code) : [...selected, code])} />
                  {name}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {selected.length >= maxKnownLanguages && <p role="status" className="text-sm text-muted">{t("limit", { count: maxKnownLanguages })}</p>}
    </div>
  );
}

export function KnownLanguageSettings({ options, initial }: { options: LanguageOption[]; initial: string[] }) {
  const t = useTranslations("knownLanguages");
  const settings = useTranslations("settings");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const [selected, setSelected] = useState(initial);
  const [state, action, pending] = useActionState(saveKnownLanguageSettings, {});

  return (
    <form action={action} aria-label={t("settingsTitle")} className="space-y-3">
      <h3 className="sd-display text-xl">{t("settingsTitle")}</h3>
      <KnownLanguagesPicker options={options} selected={selected} onChange={setSelected} disabled={pending} />
      {selected.map((code) => <input key={code} type="hidden" name="language" value={code} />)}
      {state.error && <FormMessage kind="error">{errors(state.error)}</FormMessage>}
      {state.saved && <FormMessage kind="notice">{settings("saved")}</FormMessage>}
      <Button type="submit" variant="secondary" disabled={pending}>{common(pending ? "loading" : "actions.save")}</Button>
    </form>
  );
}

"use client";

import { uiLocales } from "@dailylingua/i18n";
import { languageDisplayName } from "@dailylingua/core";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setInterfaceLanguage, type SettingsState } from "@/app/actions/settings";
import { FormMessage, SelectField } from "@/components/ui/field";

/** Interface language: the change is saved and applied as soon as it is picked. */
export function InterfaceLanguage() {
  const t = useTranslations("settings");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsState>({});

  function change(language: string) {
    startTransition(async () => {
      setResult(await setInterfaceLanguage(language));
    });
  }

  return (
    <div className="space-y-3">
      <SelectField
        label={t("interfaceLanguage.label")}
        hint={t("interfaceLanguage.hint")}
        value={locale}
        disabled={pending}
        onChange={(event) => change(event.target.value)}
      >
        {uiLocales.map((code) => (
          <option key={code} value={code} lang={code}>
            {languageDisplayName(code, code)}
          </option>
        ))}
      </SelectField>
      {result.error && <FormMessage kind="error">{te(result.error)}</FormMessage>}
      {result.saved && <FormMessage kind="notice">{t("saved")}</FormMessage>}
    </div>
  );
}

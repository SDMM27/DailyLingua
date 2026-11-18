"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { saveLearningSettings, type SettingsState } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { FormMessage, SelectField, TextField } from "@/components/ui/field";
import type { LanguageOption } from "@/lib/languages";

/** Mother tongue, time zone and reminder: one explicit save for the group. */
export function LearningSettings({
  nativeOptions,
  timeZones,
  initial,
}: {
  nativeOptions: LanguageOption[];
  timeZones: string[];
  initial: { nativeLanguage: string; timeZone: string; reminderTime: string | null };
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(saveLearningSettings, {});
  const [nativeLanguage, setNativeLanguage] = useState(initial.nativeLanguage);
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [reminder, setReminder] = useState(initial.reminderTime ?? "");

  // The saved values are always offered, even if the runtime's list does not know them.
  const zones = timeZones.includes(initial.timeZone) ? timeZones : [initial.timeZone, ...timeZones];
  const languages = nativeOptions.some((option) => option.code === initial.nativeLanguage)
    ? nativeOptions
    : [{ code: initial.nativeLanguage, name: initial.nativeLanguage }, ...nativeOptions];

  return (
    <form action={formAction} className="space-y-5">
      <SelectField
        label={t("nativeLanguage.label")}
        hint={t("nativeLanguage.hint")}
        name="nativeLanguage"
        value={nativeLanguage}
        onChange={(event) => setNativeLanguage(event.target.value)}
      >
        {languages.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={t("timeZone.label")}
        hint={t("timeZone.hint")}
        name="timeZone"
        value={timeZone}
        onChange={(event) => setTimeZone(event.target.value)}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </SelectField>
      <div className="space-y-1">
        <TextField
          label={t("reminder.label")}
          hint={t("reminder.hint")}
          name="reminderTime"
          type="time"
          value={reminder}
          onChange={(event) => setReminder(event.target.value)}
        />
        {reminder !== "" && (
          <Button variant="ghost" onClick={() => setReminder("")} className="-ms-3">
            {t("reminder.clear")}
          </Button>
        )}
      </div>
      {state.error && <FormMessage kind="error">{te(state.error)}</FormMessage>}
      {state.saved && <FormMessage kind="notice">{t("saved")}</FormMessage>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? tc("loading") : tc("actions.save")}
      </Button>
    </form>
  );
}

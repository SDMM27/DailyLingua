"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { saveGamePreferences } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export function GamePreferences(initial: { xpVisible: boolean; streakEnabled: boolean; celebrations: boolean }) {
  const t = useTranslations("settings");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const [state, action, pending] = useActionState(saveGamePreferences, {});
  const [preferences, setPreferences] = useState(initial);

  return (
    <form action={action} className="space-y-3">
      {(["xpVisible", "streakEnabled", "celebrations"] as const).map((field) => (
        <label key={field} className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-2">
          <span>{t(`game.${field}`)}</span>
          <input
            name={field}
            type="checkbox"
            checked={preferences[field]}
            onChange={(event) => setPreferences({ ...preferences, [field]: event.currentTarget.checked })}
          />
        </label>
      ))}
      {state.error && <FormMessage kind="error">{errors(state.error)}</FormMessage>}
      {state.saved && <FormMessage kind="notice">{t("saved")}</FormMessage>}
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? common("loading") : common("actions.save")}</Button>
    </form>
  );
}

"use client";

import { initTheme } from "@sdmm/design/js";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

type ThemeName = "light" | "dark" | "system";
const THEMES: readonly ThemeName[] = ["light", "dark", "system"];
const STORAGE_KEY = "sd-theme";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The theme in force: `data-theme` on <html> (set by the design system), else the system's. */
function currentChoice(): ThemeName {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(choice: ThemeName) {
  if (choice === "system") {
    delete document.documentElement.dataset.theme;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: the choice holds for this page only.
    }
  } else {
    // No toggle button is wired here (the choice is three-way): only the controller's `set` is used.
    initTheme({ toggleSelector: "[data-theme-toggle-none]" }).set(choice);
  }
  for (const listener of listeners) listener();
}

/** Light, dark or the system's theme; remembered by the design system in `localStorage`. */
export function ThemeChoice() {
  const t = useTranslations("settings.theme");
  const choice = useSyncExternalStore(subscribe, currentChoice, () => "system" as ThemeName);
  return (
    <fieldset className="space-y-2">
      <legend className="block text-sm font-semibold">{t("label")}</legend>
      <div className="flex gap-2">
        {THEMES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={choice === name}
            onClick={() => applyTheme(name)}
            className={`min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold ${choice === name ? "border-accent bg-surface-2 text-accent-strong" : "border-muted text-ink"}`}
          >
            {t(name)}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{t("hint")}</p>
    </fieldset>
  );
}

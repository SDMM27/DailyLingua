"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { savePreferences } from "@/app/actions/preferences";
import { PlusIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, LanguageTag } from "@/components/ui/primitives";
import { DEFAULT_LANGUAGE_TASTES } from "@/lib/domain/default-preferences";
import { CONTENT_TYPE_LABELS, DIFFICULTY_LABELS, LANGUAGE_PURPOSE_LABELS } from "@/lib/domain/labels";
import { languageInfo } from "@/lib/domain/languages";
import { splitBudget } from "@/lib/domain/time-budget";
import { CEFR_LEVELS, CONTENT_TYPES, type CefrLevel, type Language } from "@/lib/schemas/common";
import {
  DIFFICULTY_MODES,
  LANGUAGE_PURPOSES,
  TOPICS,
  preferencesSchema,
  type LanguageGoal,
  type LanguagePurpose,
  type Preferences,
} from "@/lib/schemas/preferences";

const MAX_LANGUAGES = 4;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "ok"; message: string }
  | { kind: "error"; messages: string[] };

const subscribeNever = () => () => {};
/** The time zone of this device; null on the server, where it is unknown. */
const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function sameSet<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

/** Whether a language has the same topics and formats as the first one (the shortcut starts checked then). */
function sharesTastes(goal: LanguageGoal, first: LanguageGoal): boolean {
  return sameSet(goal.topics, first.topics) && sameSet(goal.contentTypes, first.contentTypes);
}

function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Editable preferences, validated with the shared schema, then saved by a server action.
 * `onboarding` is the first-run screen of a new account: no language yet, and the time zone is
 * taken from the device. `persist` is false in the demo, where nothing can be saved.
 * `languages` are the ones that can be added (they have content sources).
 */
export function PreferencesForm({
  initial,
  languages,
  mode = "settings",
  persist,
}: {
  initial: Preferences;
  languages: readonly Language[];
  mode?: "settings" | "onboarding";
  persist: boolean;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  // Languages (other than the first) that follow the first one's topics and formats. Their own
  // pickers are hidden and their values are copied from the first language when saving.
  const [shared, setShared] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initial.goals.map((g) => [g.language, sharesTastes(g, initial.goals[0])])),
  );
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const onboarding = mode === "onboarding";
  const device = useSyncExternalStore(subscribeNever, deviceTimeZone, () => null);
  // On first run the device decides; afterwards the saved zone does, unless the user switches.
  const timeZone = onboarding && device ? device : prefs.timeZone;

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaveState({ kind: "idle" });
  };
  const setGoal = (language: Language, change: Partial<LanguageGoal>) =>
    set(
      "goals",
      prefs.goals.map((g) => (g.language === language ? { ...g, ...change } : g)),
    );

  const first = prefs.goals[0];
  const follows = (goal: LanguageGoal) => goal !== first && shared[goal.language] === true;

  // Followers take their values from the first language now, so removing it does not change them.
  const removeGoal = (language: Language) =>
    set(
      "goals",
      prefs.goals
        .map((g) => (follows(g) ? { ...g, topics: first.topics, contentTypes: first.contentTypes } : g))
        .filter((g) => g.language !== language),
    );

  const split = prefs.goals.length > 0 ? splitBudget(prefs.dailyMinutes, prefs.goals) : [];
  const minutesFor = (language: Language) => split.find((s) => s.language === language)?.minutes ?? 0;
  const maxWeight = Math.max(...prefs.goals.map((g) => g.weight));
  const available = languages.filter((code) => !prefs.goals.some((g) => g.language === code)).sort((a, b) =>
    languageInfo(a).nameFr.localeCompare(languageInfo(b).nameFr, "fr"),
  );

  async function handleSave() {
    const goals = prefs.goals.map((g) =>
      follows(g) ? { ...g, topics: first.topics, contentTypes: first.contentTypes } : g,
    );
    const result = preferencesSchema.safeParse({ ...prefs, goals, timeZone });
    if (!result.success) {
      setSaveState({ kind: "error", messages: [...new Set(result.error.issues.map((i) => i.message))] });
      return;
    }
    if (!persist) {
      setSaveState({ kind: "ok", message: "Préférences valides. Mode démonstration : rien n’est enregistré." });
      return;
    }
    setSaveState({ kind: "saving" });
    const outcome = await savePreferences(result.data);
    if (!outcome.ok) {
      setSaveState({ kind: "error", messages: [outcome.error] });
      return;
    }
    if (onboarding) {
      // Stay on "saving" while the next screen loads: the placement test is the last onboarding step.
      router.replace("/niveau?bienvenue=1");
      return;
    }
    setSaveState({ kind: "ok", message: "Préférences enregistrées." });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Section
        title="Langues"
        hint={
          onboarding && prefs.goals.length === 0
            ? "Commence par choisir au moins une langue."
            : "Le poids détermine la part du temps quotidien."
        }
      >
        <ul className="space-y-4">
          {prefs.goals.map((goal) => (
            <li key={goal.language} className="rounded-2xl border border-line p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LanguageTag language={goal.language} />
                  {goal.weight === maxWeight && prefs.goals.length > 1 && (
                    <span className="text-[11px] font-semibold text-muted uppercase">prioritaire</span>
                  )}
                </div>
                {prefs.goals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGoal(goal.language)}
                    className="text-xs font-medium text-muted hover:text-danger"
                  >
                    Retirer
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <LevelSelect
                  label="Niveau actuel"
                  value={goal.level}
                  onChange={(level) => setGoal(goal.language, { level })}
                />
                <LevelSelect
                  label="Objectif"
                  value={goal.targetLevel}
                  onChange={(targetLevel) => setGoal(goal.language, { targetLevel })}
                />
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">Usage</span>
                <select
                  value={goal.purpose}
                  onChange={(e) => setGoal(goal.language, { purpose: e.target.value as LanguagePurpose })}
                  className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-2.5 font-semibold focus:border-ink-soft focus:outline-none"
                >
                  {LANGUAGE_PURPOSES.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {LANGUAGE_PURPOSE_LABELS[purpose].title} — {LANGUAGE_PURPOSE_LABELS[purpose].hint}
                    </option>
                  ))}
                </select>
              </label>
              {!languages.includes(goal.language) && (
                <p className="mt-2 rounded-xl bg-surface-sunk px-3 py-2 text-xs leading-relaxed text-ink-soft">
                  Plus aucune source de contenus n’est disponible pour cette langue : les missions ne pourront
                  pas en proposer. Tu peux la garder ou la retirer.
                </p>
              )}
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">Ce que je veux travailler</span>
                <input
                  value={goal.focus}
                  onChange={(e) => setGoal(goal.language, { focus: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 focus:border-ink-soft focus:outline-none"
                />
              </label>
              {goal !== first && (
                <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={follows(goal)}
                    onChange={(e) => {
                      setShared((s) => ({ ...s, [goal.language]: e.target.checked }));
                      // Unchecking starts from the first language's choices, which stay editable.
                      if (!e.target.checked) setGoal(goal.language, { topics: first.topics, contentTypes: first.contentTypes });
                      else setSaveState({ kind: "idle" });
                    }}
                    className="size-5 shrink-0 accent-[var(--ink)]"
                  />
                  <span>Mêmes sujets et formats que {languageInfo(first.language).nameFr}</span>
                </label>
              )}
              {!follows(goal) && (
                <div className="mt-3 space-y-3">
                  <div>
                    <span className="mb-2 block text-xs font-medium text-ink-soft">Sujets favoris</span>
                    <ChipGroup
                      label={`Sujets favoris ${languageInfo(goal.language).nameFr}`}
                      options={TOPICS.map((t) => ({ value: t, label: t }))}
                      selected={goal.topics}
                      onToggle={(t) => setGoal(goal.language, { topics: toggleIn(goal.topics, t) })}
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-xs font-medium text-ink-soft">Types de contenus</span>
                    <ChipGroup
                      label={`Types de contenus ${languageInfo(goal.language).nameFr}`}
                      options={CONTENT_TYPES.map((t) => ({ value: t, label: CONTENT_TYPE_LABELS[t] }))}
                      selected={goal.contentTypes}
                      onToggle={(t) => setGoal(goal.language, { contentTypes: toggleIn(goal.contentTypes, t) })}
                    />
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">Poids</span>
                <div className="flex items-center gap-3">
                  <Stepper
                    value={goal.weight}
                    min={1}
                    max={5}
                    label={`Poids ${languageInfo(goal.language).nameFr}`}
                    onChange={(weight) => setGoal(goal.language, { weight })}
                  />
                  <span className="w-14 text-right text-sm font-semibold">{minutesFor(goal.language)} min</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {available.length > 0 && prefs.goals.length < MAX_LANGUAGES && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-ink-soft">Ajouter une langue</p>
            <div className="flex flex-wrap gap-2">
              {available.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    const tastes = first
                      ? { topics: first.topics, contentTypes: first.contentTypes }
                      : DEFAULT_LANGUAGE_TASTES;
                    setShared((s) => ({ ...s, [code]: true }));
                    set("goals", [
                      ...prefs.goals,
                      { language: code, level: "A2", targetLevel: "B1", focus: "", purpose: "general", weight: 1, ...tastes },
                    ]);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-ink-soft hover:border-ink-soft"
                >
                  <PlusIcon width={14} height={14} />
                  {languageInfo(code).nameFr}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Temps quotidien">
        <div className="flex items-baseline justify-between">
          <label htmlFor="daily-minutes" className="text-sm text-ink-soft">
            Durée de la mission
          </label>
          <span className="font-serif text-2xl font-semibold">{prefs.dailyMinutes} min</span>
        </div>
        <input
          id="daily-minutes"
          type="range"
          min={10}
          max={90}
          step={5}
          value={prefs.dailyMinutes}
          onChange={(e) => set("dailyMinutes", Number(e.target.value))}
          className="mt-3 w-full accent-[var(--ink)]"
        />
        <div className="mt-3 flex h-2 overflow-hidden rounded-full" aria-hidden="true">
          {split.map((s) => (
            <div
              key={s.language}
              className={languageStyle(s.language).bg}
              style={{ width: `${(s.minutes / prefs.dailyMinutes) * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {split.map((s) => `${languageInfo(s.language).nameFr} ${s.minutes} min`).join(" · ")}
        </p>
      </Section>

      <Section title="Difficulté souhaitée">
        <div role="radiogroup" aria-label="Difficulté souhaitée" className="grid gap-2 sm:grid-cols-3">
          {DIFFICULTY_MODES.map((mode) => {
            const active = prefs.difficulty === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set("difficulty", mode)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-ink bg-ink text-paper" : "border-line hover:bg-surface-sunk"
                }`}
              >
                <span className="block font-semibold">{DIFFICULTY_LABELS[mode].title}</span>
                <span className={`text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                  {DIFFICULTY_LABELS[mode].hint}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Mission du matin" hint="Heure de préparation de la mission quotidienne.">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="generation-time" className="text-sm text-ink-soft">
            Prête chaque jour à
          </label>
          <input
            id="generation-time"
            type="time"
            value={prefs.generationTime}
            onChange={(e) => set("generationTime", e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-2 font-semibold focus:border-ink-soft focus:outline-none"
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Fuseau horaire : {timeZone}
          {!onboarding && device && device !== prefs.timeZone && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => set("timeZone", device)}
                className="font-medium text-ink underline underline-offset-4"
              >
                Utiliser {device}
              </button>
            </>
          )}
        </p>
      </Section>

      {!onboarding && (
        <Section title="Série de jours">
          <div className="flex min-h-11 items-start gap-3 text-sm">
            <input
              id="show-streak"
              type="checkbox"
              checked={prefs.showStreak}
              onChange={(e) => set("showStreak", e.target.checked)}
              aria-describedby="show-streak-hint"
              className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]"
            />
            <div>
              <label htmlFor="show-streak" className="block">
                Afficher ma série de jours
              </label>
              <p id="show-streak-hint" className="text-xs text-muted">
                Le nombre de jours d’affilée sur l’accueil. Aucun point, aucun classement.
              </p>
            </div>
          </div>
        </Section>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState.kind === "saving"}
          className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {saveState.kind === "saving" ? "Enregistrement…" : onboarding ? "Commencer" : "Enregistrer"}
        </button>
        <div aria-live="polite">
          {saveState.kind === "ok" && (
            <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
              {saveState.message}
            </p>
          )}
          {saveState.kind === "error" && (
            <ul className="space-y-1 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {saveState.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card>
      <Eyebrow>{title}</Eyebrow>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function LevelSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CefrLevel;
  onChange: (level: CefrLevel) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CefrLevel)}
        className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-2.5 font-semibold focus:border-ink-soft focus:outline-none"
      >
        {CEFR_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stepper({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const button = "grid size-8 place-items-center rounded-full border border-line text-lg leading-none disabled:opacity-30";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={button} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Diminuer">
        −
      </button>
      <span className="w-4 text-center font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={button} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Augmenter">
        +
      </button>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: readonly T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.value)}
            className={`min-h-11 rounded-full border px-3.5 py-1.5 text-sm capitalize transition-colors ${
              active ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:bg-surface-sunk"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

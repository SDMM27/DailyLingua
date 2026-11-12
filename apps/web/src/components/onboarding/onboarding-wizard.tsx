"use client";

import { canLearn } from "@dailylingua/core";
import { startLevelSchema, type StartLevel } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, FormMessage } from "@/components/ui/field";
import { DAILY_MINUTES_OPTIONS, DEFAULT_DAILY_MINUTES } from "@/lib/onboarding";
import { filterLanguages, type LanguageOption } from "@/lib/languages";
import type { SaveErrorKey } from "@/lib/data-errors";
import { ChoiceList, type Choice } from "./choice-list";

const STEPS = ["native", "target", "level", "time"] as const;
type Step = (typeof STEPS)[number];

/**
 * First-run installation: one decision per screen, in four steps (mother tongue, language to
 * learn, starting level, time per day). Nothing is saved until the last step; going back keeps
 * every answer, and so does a failed save.
 */
export function OnboardingWizard({
  nativeOptions,
  targetOptions,
  defaultNative,
}: {
  nativeOptions: LanguageOption[];
  targetOptions: LanguageOption[];
  defaultNative: string;
}) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const [stepIndex, setStepIndex] = useState(0);
  const [native, setNative] = useState<string | null>(defaultNative);
  const [target, setTarget] = useState<string | null>(null);
  const [level, setLevel] = useState<StartLevel | null>(null);
  const [minutes, setMinutes] = useState<number>(DEFAULT_DAILY_MINUTES);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<SaveErrorKey>();
  const [pending, startTransition] = useTransition();

  const step: Step = STEPS[stepIndex] ?? "native";
  const last = stepIndex === STEPS.length - 1;

  // Each step is a new screen: move the focus to its title so that it is announced.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    titleRef.current?.focus();
  }, [stepIndex]);

  const visibleNative = useMemo(() => filterLanguages(nativeOptions, query), [nativeOptions, query]);
  const learnable = useMemo(
    () => targetOptions.filter((option) => native === null || canLearn(native, option.code)),
    [targetOptions, native],
  );

  const levelChoices: Choice[] = startLevelSchema.options.map((code) => ({
    value: code,
    meta: code,
    label: tc(`levels.${code}`),
  }));
  const minuteChoices: Choice[] = DAILY_MINUTES_OPTIONS.map((count) => ({
    value: String(count),
    label: t("time.option", { count }),
  }));

  const canContinue =
    (step === "native" && native !== null) ||
    (step === "target" && target !== null) ||
    (step === "level" && level !== null) ||
    step === "time";

  function goBack() {
    setError(undefined);
    setStepIndex((index) => Math.max(0, index - 1));
  }

  function chooseNative(code: string) {
    setNative(code);
    // The language to learn cannot be the mother tongue.
    if (target !== null && !canLearn(code, target)) setTarget(null);
  }

  function next() {
    if (!canContinue) return;
    if (!last) {
      setStepIndex((index) => index + 1);
      return;
    }
    if (native === null || target === null || level === null) return;
    setError(undefined);
    startTransition(async () => {
      const result = await completeOnboarding({
        nativeLanguage: native,
        targetLanguage: target,
        startLevel: level,
        dailyMinutes: minutes,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      // On success the action redirects and never returns.
      if (result) setError(result.error);
    });
  }

  const stepLabel = t("stepCount", { current: stepIndex + 1, total: STEPS.length });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-3">
        {stepIndex > 0 ? (
          <Button variant="ghost" onClick={goBack} disabled={pending} className="-ms-3 min-w-11 px-3">
            <svg viewBox="0 0 24 24" className="size-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            <span className="sr-only">{tc("actions.back")}</span>
          </Button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
        <div
          role="progressbar"
          aria-label={stepLabel}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          className="flex flex-1 gap-1.5"
        >
          {STEPS.map((name, index) => (
            <span key={name} className={`h-1 flex-1 rounded-full ${index <= stepIndex ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
      </header>

      <div className="mt-8 flex-1">
        <p className="meta">{stepLabel}</p>
        <h1 id={titleId} ref={titleRef} tabIndex={-1} className="sd-display mt-2 text-3xl outline-none">
          {t(`${step}.title`)}
        </h1>
        <p className="mt-2 text-muted">{t(`${step}.hint`)}</p>

        <div className="mt-6">
          {step === "native" && (
            <>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t("native.search")}
                placeholder={t("native.search")}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className={`${CONTROL_CLASS} mb-3`}
              />
              {visibleNative.length === 0 ? (
                <p role="status" className="px-2 py-4 text-muted">
                  {t("native.noResult")}
                </p>
              ) : (
                <ChoiceList
                  name="native"
                  labelledBy={titleId}
                  value={native}
                  onChange={chooseNative}
                  className="max-h-[42dvh] overflow-y-auto overscroll-contain"
                  choices={visibleNative.map((option) => ({ value: option.code, label: option.name }))}
                />
              )}
            </>
          )}
          {step === "target" && (
            <ChoiceList
              name="target"
              labelledBy={titleId}
              value={target}
              onChange={setTarget}
              choices={learnable.map((option) => ({
                value: option.code,
                label: (
                  <>
                    {option.name}
                    {option.nativeName && option.nativeName !== option.name && (
                      <span lang={option.code} className="ms-2 text-sm text-muted">
                        {option.nativeName}
                      </span>
                    )}
                  </>
                ),
              }))}
            />
          )}
          {step === "level" && (
            <ChoiceList
              name="level"
              labelledBy={titleId}
              value={level}
              onChange={(value) => setLevel(startLevelSchema.parse(value))}
              choices={levelChoices}
            />
          )}
          {step === "time" && (
            <ChoiceList
              name="time"
              labelledBy={titleId}
              value={String(minutes)}
              onChange={(value) => setMinutes(Number(value))}
              choices={minuteChoices}
            />
          )}
        </div>
      </div>

      <footer className="sticky bottom-0 space-y-3 bg-bg pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {error && <FormMessage kind="error">{te(error)}</FormMessage>}
        <Button onClick={next} disabled={!canContinue || pending}>
          {pending ? t("saving") : last ? t("finish") : tc("actions.continue")}
        </Button>
      </footer>
    </div>
  );
}

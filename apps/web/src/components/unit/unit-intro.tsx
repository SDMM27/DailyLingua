"use client";

import type { Unit } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "./icons";
import { ShellBody, ShellFooter } from "./unit-shell";
import { useUnitExtras } from "./unit-extras";

/** What the unit teaches, and the way in: start, resume or review; or « Je connais déjà », straight to the test. */
export function UnitIntro({ unit, locale, mode, step, steps, canSkip, onStart, onSkip }: {
  unit: Unit;
  locale: "fr" | "en";
  mode: "start" | "resume" | "review";
  step: number;
  steps: number;
  canSkip: boolean;
  onStart(): void;
  onSkip(): void;
}) {
  const t = useTranslations("unitSheet");
  const { number } = useUnitExtras();
  const label = mode === "resume" ? t("resume", { step, steps }) : mode === "review" ? t("review") : t("start");
  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-6 pt-2">
          <div>
            <p className="meta text-lang">{t("meta", { number: number ?? unit.order, minutes: unit.minutes })}</p>
            <h1 tabIndex={-1} className="mt-2 font-display text-[30px] leading-tight font-bold tracking-tight" lang={locale}>{unit.title[locale]}</h1>
            <p className="mt-2 text-muted" lang={locale}>{unit.situation[locale]}</p>
          </div>
          <section>
            <p className="meta">{t("goals")}</p>
            <ul className="mt-2 grid gap-2">
              {unit.canDo.map((goal) => (
                <li key={goal.id} className="flex items-start gap-2.5 font-display text-lg leading-snug" lang={locale}>
                  <Icon name="ring" className="mt-1 size-5 text-muted" />
                  {goal.text[locale]}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </ShellBody>
      <ShellFooter>
        <Button onClick={onStart}>{label}</Button>
        {canSkip && (
          <button type="button" onClick={onSkip} className="mt-3 flex min-h-14 w-full items-center gap-3 border-y border-line text-start text-[15px]">
            <Icon name="test" className="size-5 text-muted" />
            <span className="flex-1 font-semibold whitespace-nowrap">{t("skip")}</span>
            <span className="text-end text-sm text-muted">{t("skipValue", { count: unit.test.itemIds.length })}</span>
            <Icon name="chevron" className="size-[18px] text-muted" />
          </button>
        )}
      </ShellFooter>
    </>
  );
}

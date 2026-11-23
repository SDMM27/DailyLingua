"use client";

import type { Unit } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "./icons";
import { ShellBody, ShellFooter } from "./unit-shell";

/**
 * The entry of a unit that has a warm-up due: the sentences missed at the last test come first (the one primary action),
 * then the unit as usual, or the test straight away.
 */
export function WarmupIntro({ unit, locale, count, unitLabel, canSkip, onWarmup, onUnit, onSkip }: {
  unit: Unit;
  locale: "fr" | "en";
  count: number;
  /** Label of the way into the unit itself (start, resume or review). */
  unitLabel: string;
  canSkip: boolean;
  onWarmup(): void;
  onUnit(): void;
  onSkip(): void;
}) {
  const t = useTranslations("warmup");
  const sheet = useTranslations("unitSheet");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-6 pt-2">
          <div>
            <p className="meta text-lang">{sheet("meta", { number: unit.order, minutes: unit.minutes })}</p>
            <h1 tabIndex={-1} ref={heading} className="mt-2 font-display text-[30px] leading-tight font-bold tracking-tight" lang={locale}>{unit.title[locale]}</h1>
          </div>
          <section className="rounded-xl border border-line px-4 py-3">
            <p className="font-semibold">{t("title", { count })}</p>
            <p className="text-sm text-muted">{sheet("warmupNote")}</p>
          </section>
        </div>
      </ShellBody>
      <ShellFooter>
        <Button onClick={onWarmup}>{t("start")}</Button>
        <Button variant="secondary" className="mt-3 w-full" onClick={onUnit}>{unitLabel}</Button>
        {canSkip && (
          <button type="button" onClick={onSkip} className="mt-3 flex min-h-14 w-full items-center gap-3 border-y border-line text-start text-[15px]">
            <Icon name="test" className="size-5 text-muted" />
            <span className="flex-1 font-semibold whitespace-nowrap">{sheet("skip")}</span>
            <span className="text-end text-sm text-muted">{sheet("skipValue", { count: unit.test.itemIds.length })}</span>
            <Icon name="chevron" className="size-[18px] text-muted" />
          </button>
        )}
      </ShellFooter>
    </>
  );
}

/** After the warm-up: the test is proposed; the unit stays one tap away. */
export function WarmupDone({ onTest, onUnit, unitLabel }: { onTest(): void; onUnit(): void; unitLabel: string }) {
  const t = useTranslations("warmup");
  const sheet = useTranslations("unitSheet");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-3 pt-2">
          <h1 tabIndex={-1} ref={heading} className="font-display text-[30px] leading-tight font-bold tracking-tight">{t("doneTitle")}</h1>
          <p className="text-muted">{t("doneBody")}</p>
        </div>
      </ShellBody>
      <ShellFooter>
        <Button onClick={onTest}>{sheet("retake")}</Button>
        <Button variant="ghost" className="mt-1.5 w-full" onClick={onUnit}>{unitLabel}</Button>
      </ShellFooter>
    </>
  );
}

"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import type { Station } from "@/lib/units/path";

/**
 * The sheet of a unit, opened from its station: what the learner will be able to say, the way in (start, resume or
 * review), and « Je connais déjà » straight to the test. Nothing is locked: every unit opens. The bilan has one action
 * only (it already is a test).
 */
export function UnitSheet({ station, language, locale, onClose }: { station: Station; language: string; locale: "fr" | "en"; onClose(): void }) {
  const t = useTranslations("unitSheet");
  const warm = useTranslations("warmup");
  const actions = useTranslations("common.actions");
  const assessment = useTranslations("assessment");
  const bilan = station.kind === "assessment";
  const done = station.status === "done";
  const href = `/parcours/${language}/${station.id}`;
  const label = bilan ? assessment(done ? "retake" : "start") : done ? t("review") : station.started && station.step ? t("resume", { step: station.step.position, steps: station.step.total }) : t("start");
  return (
    <BottomSheet labelledBy="unit-sheet-title" onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="meta text-lang">{bilan ? assessment("meta", { minutes: station.minutes }) : t("meta", { number: station.number, minutes: station.minutes })}</p>
          <h2 id="unit-sheet-title" data-sheet-title tabIndex={-1} lang={locale} className="mt-1 font-display text-[22px] leading-tight font-bold">{station.title}</h2>
          {station.letters.length > 0 && <p lang={language} className="mt-1 font-display text-lg text-muted">{station.letters.join(" ")}</p>}
        </div>
        <button type="button" aria-label={actions("close")} onClick={onClose} className="-me-2 grid size-11 shrink-0 place-items-center rounded-full"><Icon name="close" /></button>
      </div>
      <section className="mt-4">
        <p className="meta">{t("goals")}</p>
        <ul className="mt-2 grid gap-2">
          {station.goals.map((goal) => (
            <li key={goal} lang={locale} className="flex items-start gap-2.5 font-display text-lg leading-snug">
              <Icon name={done ? "check" : "ring"} className={`mt-1 size-5 ${done ? "text-success" : "text-muted"}`} />
              {goal}
            </li>
          ))}
        </ul>
        {done && station.passedOn && <p className="mt-2 text-sm text-muted">{t("goalsDone", { date: station.passedOn })}</p>}
        {bilan && <p className="mt-3 text-sm text-muted">{assessment("questions", { count: station.testSize })}</p>}
      </section>
      {station.warmup > 0 && !done && (
        <div className="mt-4 rounded-xl border border-line px-4 py-3">
          <p className="font-semibold">{warm("title", { count: station.warmup })}</p>
          <p className="text-sm text-muted">{t("warmupNote")}</p>
        </div>
      )}
      <div className="mt-5">
        <Link href={href} className={buttonClass("primary")}>{label}</Link>
        {!bilan && (
          <Link href={`${href}?start=test`} className="mt-3 flex min-h-14 w-full items-center gap-3 border-y border-line text-start text-[15px]">
            <Icon name="test" className="size-5 text-muted" />
            <span className="flex-1 font-semibold whitespace-nowrap">{done ? t("retake") : t("skip")}</span>
            {!done && <span className="text-end text-sm text-muted">{t("skipValue", { count: station.testSize })}</span>}
            <Icon name="chevron" className="size-[18px] text-muted" />
          </Link>
        )}
      </div>
    </BottomSheet>
  );
}

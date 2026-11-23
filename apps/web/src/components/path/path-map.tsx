"use client";

import type { UnitStep } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { minutesLeft, type PathModel, type Station, type Zone } from "@/lib/units/path";
import { UnitSheet } from "./unit-sheet";

const STEP_KEYS = {
  dialogue: "steps.dialogue", key_phrases: "steps.key_phrases", grammar: "steps.grammar", exercises: "steps.exercises", conversation: "steps.conversation",
  test: "steps.test", letters: "steps.letters", sounds: "steps.sounds", words: "steps.words", reading: "steps.reading",
} as const satisfies Record<UnitStep, string>;

const RAIL = {
  solid: "before:start-5 before:border-s-4 before:border-lang",
  dashed: "before:start-[21px] before:border-s-2 before:border-dashed before:border-border-strong",
  // Solid up to the station in progress, dashed after it.
  current:
    "before:start-5 before:bottom-auto before:h-[18px] before:border-s-4 before:border-lang after:absolute after:start-[21px] after:top-[18px] after:bottom-0 after:border-s-2 after:border-dashed after:border-border-strong after:content-[''] last:after:hidden",
} as const;

const ROW =
  "relative grid grid-cols-[44px_1fr] gap-x-3 pb-[22px] before:absolute before:inset-y-0 before:content-[''] first:before:top-3 last:before:bottom-auto last:before:h-3";

/** The path of a language as « La ligne »: one station per unit, solid up to the current one, dashed after it. */
export function PathMap({ language, languageName, locale, model }: { language: string; languageName: string; locale: "fr" | "en"; model: PathModel }) {
  const t = useTranslations("path");
  const [open, setOpen] = useState<Station | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const current = useRef<HTMLLIElement>(null);

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    const element = current.current;
    if (!element || model.entries.findIndex((entry) => entry.type === "station" && entry.id === model.currentId) < 2) return;
    // The station in progress goes to the upper third of the screen (no animation when motion is reduced).
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3, behavior: reduce ? "auto" : "smooth" });
  }, [model.currentId, model.entries]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="meta">{t("meta", { language: languageName })}</p>
        <h1 ref={title} tabIndex={-1} className="mt-1.5 font-display text-[30px] leading-tight font-bold tracking-tight">{t("level", { level: model.level })}</h1>
        <p className="mt-1.5 text-sm text-muted">
          <b className="font-semibold text-ink">{t("progress", { done: model.done, total: model.total })}</b>{" "}
          {t(model.currentIsWriting ? "hintWriting" : "hint")}
        </p>
      </header>
      <ol aria-label={t("listLabel", { level: model.level })}>
        {model.entries.map((entry, index) =>
          entry.type === "zone" ? (
            <ZoneRow key={`zone-${entry.zone}`} zone={entry} rail={railOfNext(model, index)} />
          ) : (
            <StationRow key={entry.id} ref={entry.id === model.currentId ? current : undefined} station={entry} language={language} locale={locale} onOpen={() => setOpen(entry)} />
          ),
        )}
      </ol>
      {model.currentId === null && model.total > 0 && <p className="text-sm text-muted">{t("allDone")}</p>}
      {open && <UnitSheet station={open} language={language} locale={locale} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** The rail of a zone heading follows the station after it: solid when that one is done or in progress. */
function railOfNext(model: PathModel, index: number): "solid" | "dashed" {
  const next = model.entries.slice(index + 1).find((entry): entry is Station => entry.type === "station");
  return next && next.status !== "todo" ? "solid" : "dashed";
}

function ZoneRow({ zone, rail }: { zone: Zone; rail: "solid" | "dashed" }) {
  const t = useTranslations("path");
  return (
    <li className={`${ROW} ${RAIL[rail]}`}>
      <span aria-hidden="true" className="relative z-10 mt-2 h-1 w-6 justify-self-center rounded-sm bg-ink" />
      <p className="meta uppercase">{t(zone.zone === "writing" ? "zoneWriting" : "zoneSituations", { level: zone.level })}</p>
    </li>
  );
}

function StationRow({ station, language, locale, onOpen, ref }: { station: Station; language: string; locale: "fr" | "en"; onOpen(): void; ref?: React.Ref<HTMLLIElement> }) {
  const t = useTranslations("path");
  const unit = useTranslations("unit");
  const writing = station.kind === "script";
  const letter = station.letters[0];
  const title = t("unitTitle", { number: station.number, title: station.title });
  const lettersLabel = station.letters.join(", ");
  const listed = station.letters.join(" · ");

  const base = "relative z-10 grid place-items-center justify-self-center rounded-full";
  const marker =
    station.status === "done" ? (
      <span aria-hidden="true" className={`${base} ${letter ? "size-[30px]" : "size-6"} bg-lang text-on-lang`}>
        {letter ? <span lang={language} className="font-display text-[15px] leading-none font-bold">{letter}</span> : <Icon name="check" className="size-3.5" />}
      </span>
    ) : station.status === "current" ? (
      <span aria-hidden="true" className={`${base} ${letter ? "size-10" : "size-9"} border-[5px] border-lang bg-bg text-lang`}>
        {letter && <span lang={language} className="font-display text-[17px] leading-none font-bold">{letter}</span>}
      </span>
    ) : (
      <span aria-hidden="true" className={`${base} ${letter ? "size-[30px] text-muted" : "mt-1 size-4"} border-2 border-border-strong bg-bg`}>
        {letter && <span lang={language} className="font-display text-sm leading-none font-bold">{letter}</span>}
      </span>
    );

  if (station.status === "current") {
    const step = station.started ? station.step : null;
    const stepName = step ? unit(STEP_KEYS[step.key]) : "";
    const minutes = step ? minutesLeft(station.minutes, step.position, step.total) : station.minutes;
    return (
      <li ref={ref} aria-current="step" className={`${ROW} ${RAIL.current}`}>
        {marker}
        <div className="min-w-0">
          <p className="meta text-lang">
            {step
              ? t(writing ? "currentMetaWriting" : "currentMeta", { number: station.number, step: step.position, steps: step.total })
              : t(writing ? "currentMetaStartWriting" : "currentMetaStart", { number: station.number })}
          </p>
          <h2 className="mt-1">
            <button
              type="button"
              onClick={onOpen}
              aria-label={step ? t("a11yCurrent", { title: station.title, step: step.position, steps: step.total }) : t("a11yCurrentStart", { title: station.title, minutes })}
              className="min-h-11 text-start font-display text-[26px] leading-tight font-bold tracking-tight"
              lang={locale}
            >
              {station.title}
            </button>
          </h2>
          {listed && <p lang={language} aria-label={lettersLabel} className="text-[15px] text-muted">{listed}</p>}
          <p className="text-sm text-muted">{step ? t("remaining", { step: stepName, minutes }) : t("remainingStart", { minutes })}</p>
          <Link href={`/parcours/${language}/${station.id}`} className={`${buttonClass("primary")} mt-3.5`}>{t(station.started ? "continue" : "start")}</Link>
        </div>
      </li>
    );
  }

  const done = station.status === "done";
  const label = done ? t("a11yDone", { title, canDo: station.canDo }) : t("a11yTodo", { title, minutes: station.minutes });
  return (
    <li className={`${ROW} ${done ? RAIL.solid : RAIL.dashed}`}>
      {marker}
      <button type="button" onClick={onOpen} aria-label={label} className="block min-h-11 min-w-0 text-start">
        <span className="block text-base leading-snug font-semibold" lang={locale}>{title}</span>
        {done ? (
          <>
            {/* Upright for writing units: italic Cyrillic changes letter shapes (т looks like m, д like g). */}
            <span className={`mt-0.5 block font-display text-[15px] leading-snug ${station.kind === "script" ? "" : "italic"}`} lang={locale}>{station.canDo}</span>
            {station.passedByTest && <span className="block text-[13px] text-muted">{t("passedByTest")}</span>}
          </>
        ) : (
          <span className="mt-0.5 block text-[13px] text-muted">
            {listed && <span lang={language}>{listed} · </span>}
            {t("minutes", { minutes: station.minutes })}
          </span>
        )}
      </button>
    </li>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "./icons";
import { ShellBody, ShellFooter } from "./unit-shell";

const RADIUS = 40;

/** The score in a circle, with a tick outside it at the pass mark. Written value in the middle; the arc only repeats it. */
export function ScoreRing({ correct, total, passMark, passed, animate }: { correct: number; total: number; passMark: number; passed: boolean; animate: boolean }) {
  const t = useTranslations("unitResult");
  const [shown, setShown] = useState(animate ? 0 : correct);
  useEffect(() => {
    if (!animate) return;
    const frame = requestAnimationFrame(() => setShown(correct));
    return () => cancelAnimationFrame(frame);
  }, [animate, correct]);
  const angle = (-90 + (passMark / total) * 360) * (Math.PI / 180);
  const point = (radius: number) => `${(50 + radius * Math.cos(angle)).toFixed(2)} ${(50 + radius * Math.sin(angle)).toFixed(2)}`;
  return (
    <div role="img" aria-label={t("scoreA11y", { correct, total, passMark })} className="relative size-[156px]">
      <svg viewBox="0 0 100 100" className="block size-full" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="7" className="stroke-surface-2" />
        <circle
          cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="7" strokeLinecap="round" pathLength="100"
          strokeDasharray={`${(shown / total) * 100} 100`}
          transform="rotate(-90 50 50)"
          className={`${passed ? "stroke-success" : "stroke-accent"} transition-[stroke-dasharray] duration-[600ms] ease-out motion-reduce:transition-none`}
        />
        <path d={`M${point(44)}L${point(50)}`} strokeWidth="2.2" strokeLinecap="round" className="stroke-ink" />
      </svg>
      <p aria-hidden="true" className="absolute inset-0 grid place-content-center text-center leading-tight">
        <b className="font-display text-[34px] font-bold tracking-tight">{t("score", { correct, total })}</b>
        <span className="mt-1 font-mono text-xs tracking-wide text-muted">{t("passMark", { passMark }).toUpperCase()}</span>
      </p>
    </div>
  );
}

export interface MissedPhrase {
  text: string;
  /** The explanation shown under it, in the learner's language. */
  note: string | null;
}

/** The end of the test: passed, or not yet. The score is local; the server confirms it when the events are delivered. */
export function UnitResult({ language, locale, unitTitle, passed, correct, total, passMark, canDo, xpTest, xpKept, missed, hasNext, animate, onNext, onBack, onRetake }: {
  language: string;
  locale: "fr" | "en";
  unitTitle: string;
  passed: boolean;
  correct: number;
  total: number;
  passMark: number;
  canDo: string[];
  /** XP the test would earn (estimate), or null (XP hidden, or already earned). */
  xpTest: number | null;
  /** XP already won in this unit (estimate); 0 when the test was taken directly. */
  xpKept: number;
  missed: MissedPhrase[];
  hasNext: boolean;
  animate: boolean;
  onNext(): void;
  onBack(): void;
  onRetake(): void;
}) {
  const t = useTranslations("unitResult");
  const actions = useTranslations("common.actions");
  const [sheet, setSheet] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-8 pt-2">
          <div className="grid justify-items-center gap-3.5 text-center">
            <ScoreRing correct={correct} total={total} passMark={passMark} passed={passed} animate={animate} />
            <h1 tabIndex={-1} ref={heading} className="font-display text-[30px] leading-tight font-bold tracking-tight">{t(passed ? "passed" : "notYet")}</h1>
            {passed ? (
              xpTest !== null && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-3 py-1 font-mono text-[15px] text-xp">
                    <Icon name="xp" className="size-4" />
                    {t("xpTest", { xp: xpTest })}
                  </span>
                  <p className="text-xs text-muted">{t("xpEstimate")}</p>
                </>
              )
            ) : (
              <p className="max-w-[30ch] text-sm text-muted">
                {t("missing", { count: passMark - correct })} {t("missedBack", { count: missed.length })}
                {xpKept > 0 ? t("xpKept", { xp: xpKept }) : t("end")}
              </p>
            )}
          </div>
          {passed ? (
            <section aria-label={t("canDo", { title: unitTitle })}>
              <p className="meta">{t("canDo", { title: unitTitle })}</p>
              <ul className="mt-2 grid gap-2">
                {canDo.map((text) => (
                  <li key={text} className="flex items-start gap-2.5 font-display text-lg leading-snug" lang={locale}>
                    <Icon name="check" className="mt-1 size-5 text-success" />
                    {text}
                  </li>
                ))}
              </ul>
            </section>
          ) : missed.length > 0 && (
            <button type="button" onClick={() => setSheet(true)} className="flex min-h-14 w-full items-center gap-3 border-y border-line text-start font-semibold">
              <Icon name="repeat" className="size-5 text-muted" />
              <span className="flex-1">{t("seeMissed", { count: missed.length })}</span>
              <Icon name="chevron" className="size-[18px] text-muted" />
            </button>
          )}
        </div>
      </ShellBody>
      <ShellFooter>
        {passed && hasNext ? <Button onClick={onNext}>{t("next")}</Button> : <Button onClick={onBack}>{t("back")}</Button>}
        <p className="mt-1.5 flex justify-center">
          {passed ? (hasNext && (
            <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center px-1 font-semibold text-accent-strong underline underline-offset-4">{t("back")}</button>
          )) : (
            <button type="button" onClick={onRetake} className="inline-flex min-h-11 items-center px-1 font-semibold text-accent-strong underline underline-offset-4">{t("retake")}</button>
          )}
        </p>
      </ShellFooter>
      {sheet && (
        <BottomSheet labelledBy="missed-title" onClose={() => setSheet(false)}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="missed-title" data-sheet-title tabIndex={-1} className="font-display text-[22px] leading-tight font-bold">{t("seeMissed", { count: missed.length })}</h2>
            <button type="button" aria-label={actions("close")} onClick={() => setSheet(false)} className="grid size-11 place-items-center rounded-full"><Icon name="close" /></button>
          </div>
          <ul className="mt-3 grid max-h-[55dvh] gap-4 overflow-y-auto">
            {missed.map((phrase) => (
              <li key={phrase.text}>
                <p className="whitespace-pre-line font-display text-[19px] leading-snug" lang={language} dir="auto">{phrase.text}</p>
                {phrase.note && <p className="text-sm text-muted" lang={locale}>{phrase.note}</p>}
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
    </>
  );
}

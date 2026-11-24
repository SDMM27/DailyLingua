"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "./unit-result";
import { ShellBody, ShellFooter } from "./unit-shell";

/** A unit to go over before taking the bilan again: the unit a missed question was drawn from. */
export interface ReviewUnit {
  id: string;
  number: number;
  title: string;
}

/**
 * The end of the bilan (`j4-pr3.md` §2.4): passed, the level is confirmed; not yet, the score, the pass mark and the
 * units the missed questions come from. No warm-up: the bilan has none. The score is local; the server confirms it.
 */
export function AssessmentResult({ locale, level, passed, correct, total, passMark, review, animate, onBack, onRetake }: {
  locale: "fr" | "en";
  level: string;
  passed: boolean;
  correct: number;
  total: number;
  passMark: number;
  review: ReviewUnit[];
  animate: boolean;
  onBack(): void;
  onRetake(): void;
}) {
  const t = useTranslations("assessment");
  const path = useTranslations("path");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-8 pt-2">
          <div className="grid justify-items-center gap-3.5 text-center">
            <ScoreRing correct={correct} total={total} passMark={passMark} passed={passed} animate={animate} />
            <h1 tabIndex={-1} ref={heading} className="font-display text-[30px] leading-tight font-bold tracking-tight">{passed ? t("passed", { level }) : t("notYet")}</h1>
            {!passed && <p className="text-sm text-muted">{t("need", { passMark, total })}</p>}
          </div>
          {!passed && review.length > 0 && (
            <section aria-label={t("toReview")}>
              <p className="meta">{t("toReview")}</p>
              <ul className="mt-2 grid gap-2">
                {review.map((unit) => (
                  <li key={unit.id} lang={locale} className="font-display text-lg leading-snug">{path("unitTitle", { number: unit.number, title: unit.title })}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </ShellBody>
      <ShellFooter>
        <Button onClick={onBack}>{t("back")}</Button>
        {!passed && (
          <p className="mt-1.5 flex justify-center">
            <button type="button" onClick={onRetake} className="inline-flex min-h-11 items-center px-1 font-semibold text-accent-strong underline underline-offset-4">{t("retake")}</button>
          </p>
        )}
      </ShellFooter>
    </>
  );
}

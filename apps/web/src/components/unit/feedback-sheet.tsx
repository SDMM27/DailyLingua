"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "./icons";

export type Verdict = "correct" | "retry" | "wrong";

/**
 * The calm feedback of an exercise: no fill, a written verdict (« Juste », « À revoir »), a short explanation. A first
 * wrong try gives no answer and offers « Réessayer »; a second one gives the expected sentence.
 */
export function FeedbackSheet({ verdict, xp, language, locale, expected, explanation, hint, nearMiss, comesBack, onContinue, onRetry }: {
  verdict: Verdict;
  /** XP gained (estimate); 0 or null hides the pill. */
  xp: number | null;
  language: string;
  locale: "fr" | "en";
  expected?: string | null;
  explanation?: string | null;
  hint?: string | null;
  nearMiss?: boolean;
  comesBack?: boolean;
  onContinue(): void;
  onRetry(): void;
}) {
  const t = useTranslations("dailySession");
  const exercise = useTranslations("exercise");
  return (
    <BottomSheet labelledBy="feedback-title" modal={false} tone="calm">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h2 id="feedback-title" data-sheet-title tabIndex={-1} className="flex items-center gap-2.5 font-display text-[22px] leading-tight font-bold">
          {verdict === "correct" ? <Icon name="check" className="size-[22px] text-success" /> : <Icon name="strike" className="size-[18px] text-error" />}
          {t(verdict === "correct" ? "correct" : "wrong")}
        </h2>
        {verdict === "correct" && xp ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-3 py-1 font-mono text-base font-medium text-xp">
            <Icon name="xp" className="size-4" />
            {exercise("xp", { xp })}
          </span>
        ) : null}
      </div>
      {verdict === "wrong" && expected && (
        <p className="mt-2 whitespace-pre-line font-display text-[22px] leading-snug" lang={language} dir="auto">
          <span className="sr-only">{exercise("expected")} : </span>
          {expected}
        </p>
      )}
      {nearMiss && verdict !== "correct" && <p className="mt-2 text-sm text-ink" lang={locale}>{t("almost")}</p>}
      {verdict === "retry" && hint && <p className="mt-2 text-sm text-ink" lang={locale}>{hint}</p>}
      {verdict !== "retry" && explanation && <p className="mt-2 text-sm text-ink" lang={locale}>{explanation}</p>}
      {verdict === "wrong" && comesBack && <p className="mt-1 text-sm text-muted">{exercise("comesBack")}</p>}
      <div className="mt-5">
        {verdict === "retry" ? <Button onClick={onRetry}>{exercise("retry")}</Button> : <Button onClick={onContinue}>{t("continue")}</Button>}
      </div>
    </BottomSheet>
  );
}

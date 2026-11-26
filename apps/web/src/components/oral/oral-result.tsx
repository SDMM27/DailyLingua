"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ShellBody, ShellFooter } from "@/components/unit/unit-shell";
import type { OralSummary } from "@/lib/oral/session";

/**
 * The end of « À voix haute »: four sober rows and the XP. The XP is the estimate of this device, said so: it becomes
 * « envoyé au serveur » once the queue has delivered the events (the server decides the amount with its caps and its
 * once-a-day rule, and the app learns it on the next screen that reads the day).
 */
export function OralResult({ summary, xpVisible, delivered, count, onFinish }: {
  summary: OralSummary;
  xpVisible: boolean;
  /** The queue has delivered every event. */
  delivered: boolean;
  /** Different sentences of the series, for the line about tomorrow. */
  count: number;
  onFinish(): void;
}) {
  const t = useTranslations("oral.end");
  const session = useTranslations("dailySession");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const { repeated, dictation, anticipation, toReview } = summary;
  const rows = [
    repeated.count > 0 && { label: t("repeated"), value: t("repeatedValue", { count: repeated.count, passed: repeated.passed }), declared: false },
    dictation.count > 0 && { label: t("dictation"), value: t("dictationValue", { count: dictation.count, percent: Math.round(dictation.average * 100) }), declared: false },
    anticipation.total > 0 && { label: t("anticipation"), value: t("anticipationValue", { had: anticipation.had, total: anticipation.total }), declared: true },
    { label: t("review"), value: t("reviewValue", { count: toReview }), declared: false },
  ].filter((row) => row !== false);
  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-8 pt-6">
          <div className="grid justify-items-center gap-3.5 text-center">
            <h1 tabIndex={-1} ref={heading} className="font-display text-[30px] leading-tight font-bold tracking-tight">{t("title")}</h1>
            {xpVisible && summary.xp > 0 && (
              <span
                role="status"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[15px] ${delivered ? "bg-xp-soft text-xp" : "border border-dashed border-border-strong text-muted"}`}
              >
                <Icon name="xp" className="size-4" />
                {t(delivered ? "xpSent" : "xpPending", { xp: summary.xp })}
              </span>
            )}
          </div>
          <dl className="grid">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-3 last:border-b">
                <dt className="font-semibold">{row.label}</dt>
                <dd className="text-end text-sm text-muted">
                  {row.declared ? `${row.value} · ${t("declared")}` : row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </ShellBody>
      <ShellFooter>
        <p className="mb-3 text-center text-sm text-muted">{count > 0 && t("tomorrow")}</p>
        <Button onClick={onFinish}>{session("finish")}</Button>
      </ShellFooter>
    </>
  );
}

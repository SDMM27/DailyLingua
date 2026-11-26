"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ShellBody, ShellFooter } from "@/components/unit/unit-shell";

/** The way into « À voix haute »: what the three parts are, where the sentences come from, where the voice goes. */
export function OralEntry({ languageName, minutes, count, dictated, units, onStart, roleplayCard }: {
  languageName: string;
  minutes: number;
  /** Different sentences in the series. */
  count: number;
  /** Sentences to write. */
  dictated: number;
  /** Titles of the units the sentences come from. */
  units: string[];
  onStart(): void;
  roleplayCard?: ReactNode;
}) {
  const t = useTranslations("oral");
  const rows = [
    { title: t("steps.anticipate"), hint: t("steps.anticipateHint") },
    { title: t("steps.repeat"), hint: t("steps.repeatHint") },
    { title: t("steps.dictation"), hint: t("steps.dictationHint", { count: dictated }) },
  ];
  const numerals = ["I", "II", "III"];
  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-6 pt-2">
          <div>
            <p className="meta text-lang">{t("entry.meta", { language: languageName, minutes })}</p>
            <h1 tabIndex={-1} className="mt-2 font-display text-[30px] leading-tight font-bold tracking-tight">{t("card.title")}</h1>
            <p className="mt-2 text-muted">{t("entry.sources", { count, units: units.join(", ") })}</p>
          </div>
          <ol aria-label={t("entry.list")} className="grid gap-4">
            {rows.map((row, index) => (
              <li key={row.title} className="flex items-baseline gap-3">
                <span aria-hidden="true" className="w-6 shrink-0 font-display text-[17px] text-accent-strong">{numerals[index]}</span>
                <div>
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-sm text-muted">{row.hint}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="flex items-start gap-2.5 text-sm text-muted">
            <Icon name="info" className="mt-0.5 size-[18px]" />
            {t("entry.privacy")}
          </p>
          {roleplayCard}
        </div>
      </ShellBody>
      <ShellFooter>
        <Button onClick={onStart}>{t("entry.start")}</Button>
      </ShellFooter>
    </>
  );
}

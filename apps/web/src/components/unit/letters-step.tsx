"use client";

import type { ScriptUnit } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipButton } from "./item-view";
import { ShellBody, ShellFooter } from "./unit-shell";

/**
 * Step « Lettres » of a writing unit: the letters of the unit one at a time, large, in upper and lower case, with its
 * name, its sound in the explanation language, a warning when it is a false friend, and an example word to listen to.
 * The step ends when the last letter has been seen; the recognition items follow.
 */
export function LettersStep({ unit, locale, onFinished }: { unit: ScriptUnit; locale: "fr" | "en"; onFinished(): void }) {
  const t = useTranslations("unitScript");
  const actions = useTranslations("common.actions");
  const [index, setIndex] = useState(0);
  const letters = unit.letters;
  const letter = letters[index]!;
  const last = index === letters.length - 1;
  const language = unit.language;
  return (
    <>
      <ShellBody>
        <div key={letter.lower} className="flex flex-col gap-6 pt-2">
          <p className="meta" aria-live="polite">{t("letterPosition", { position: index + 1, total: letters.length })}</p>
          <div className="flex items-baseline justify-center gap-8" lang={language}>
            <span className="sr-only">{t("upper")}</span>
            <span className="font-display text-[88px] leading-none font-semibold">{letter.upper}</span>
            <span className="sr-only">{t("lower")}</span>
            <span className="font-display text-[88px] leading-none font-semibold">{letter.lower}</span>
          </div>
          <div className="text-center">
            <p className="text-lg">
              <span className="font-display" lang={language}>{letter.name}</span>
              <span className="text-muted"> · {t("reads", { latin: letter.latin })}</span>
            </p>
            <p className="meta mt-1">{t(`kinds.${letter.kind}`)}</p>
          </div>
          <section>
            <p className="meta">{t("sound")}</p>
            <p className="mt-1 text-[18px] leading-relaxed" lang={locale}>{letter.sound[locale]}</p>
          </section>
          {letter.kind === "false-friend" && letter.lookalike && (
            <p role="note" className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-[16px] leading-relaxed" lang={locale}>
              {t("falseFriend", { lookalike: letter.lookalike })}
            </p>
          )}
          <section className="flex items-center gap-3 border-t border-line pt-5">
            <ClipButton path={letter.example.audio} label={t("listenExample", { word: letter.example.word })} quiet />
            <div className="min-w-0">
              <p className="meta">{t("exampleLabel")}</p>
              <p className="font-display text-[26px] leading-snug" lang={language}>{letter.example.word}</p>
              <p className="text-[15px] text-muted" lang={locale}>{letter.example.translation[locale]}</p>
            </div>
          </section>
        </div>
      </ShellBody>
      <ShellFooter>
        <Button onClick={last ? onFinished : () => setIndex(index + 1)}>{last ? actions("continue") : t("next")}</Button>
        {index > 0 && (
          <Button variant="ghost" className="mt-1 w-full" onClick={() => setIndex(index - 1)}>{t("previous")}</Button>
        )}
      </ShellFooter>
    </>
  );
}

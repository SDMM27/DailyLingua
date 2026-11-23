"use client";

import type { ScriptUnit } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipButton } from "./item-view";
import { ShellBody, ShellFooter } from "./unit-shell";

/**
 * Step « Mots » of a writing unit: the words the learner can now read. Each is large; a tap shows how it reads
 * (transliteration) and what it means, so the learner reads first and checks after. The audio plays on its own button.
 */
export function WordsStep({ unit, locale, onFinished }: { unit: ScriptUnit; locale: "fr" | "en"; onFinished(): void }) {
  const t = useTranslations("unitScript");
  const reader = useTranslations("reader");
  const actions = useTranslations("common.actions");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <>
      <ShellBody>
        <p className="text-muted" lang={locale}>{t("wordsIntro")}</p>
        {unit.words.some((word) => word.audio === null) && <p role="status" className="mt-1 text-sm text-muted">{reader("audioPending")}</p>}
        <ul className="mt-6 grid gap-2">
          {unit.words.map((word) => {
            const shown = open.has(word.id);
            return (
              <li key={word.id} className="flex items-center gap-3 border-b border-line py-2">
                <ClipButton path={word.audio} label={t("listenWord", { word: word.text })} quiet />
                <button
                  type="button"
                  aria-expanded={shown}
                  aria-label={t("wordToggle", { word: word.text })}
                  onClick={() => toggle(word.id)}
                  className="min-h-14 min-w-0 flex-1 text-start"
                >
                  <span className="block font-display text-[30px] leading-tight" lang={unit.language}>{word.text}</span>
                  {shown && (
                    <span className="block text-[15px] text-muted">
                      <span className="font-mono">{word.latin}</span>
                      <span lang={locale}> · {word.translation[locale]}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </ShellBody>
      <ShellFooter><Button onClick={onFinished}>{actions("continue")}</Button></ShellFooter>
    </>
  );
}

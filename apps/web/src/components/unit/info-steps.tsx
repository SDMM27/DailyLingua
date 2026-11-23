"use client";

import type { Unit } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ClipButton } from "./item-view";
import { ShellBody, ShellFooter } from "./unit-shell";

/** The key phrases of the unit, each one to listen to: the learner reads them before being asked for them. */
export function KeyPhrasesInfo({ phrases, language, locale, onContinue }: {
  phrases: Unit["keyPhrases"];
  language: string;
  locale: "fr" | "en";
  onContinue(): void;
}) {
  const t = useTranslations("unit");
  const play = useTranslations("dialogue");
  const reader = useTranslations("reader");
  const actions = useTranslations("common.actions");
  return (
    <>
      <ShellBody>
        <p className="text-muted">{t("keyPhrasesIntro")}</p>
        {phrases.some((phrase) => phrase.audio === null) && <p role="status" className="mt-1 text-sm text-muted">{reader("audioPending")}</p>}
        <ul className="mt-6 grid gap-6">
          {phrases.map((phrase, index) => (
            <li key={phrase.id} className="flex items-start gap-3">
              <ClipButton path={phrase.audio} label={play("play", { line: index + 1 })} quiet />
              <div className="min-w-0 pt-1">
                <p className="font-display text-[22px] leading-snug" lang={language} dir="auto">{phrase.text}</p>
                <p className="text-[15px] text-muted" lang={locale}>{phrase.translation[locale]}</p>
              </div>
            </li>
          ))}
        </ul>
      </ShellBody>
      <ShellFooter><Button onClick={onContinue}>{actions("continue")}</Button></ShellFooter>
    </>
  );
}

/** The grammar summary of the unit, in the explanation language. */
export function GrammarInfo({ summary, locale, onContinue }: { summary: string; locale: "fr" | "en"; onContinue(): void }) {
  const t = useTranslations("unit");
  const actions = useTranslations("common.actions");
  return (
    <>
      <ShellBody>
        <p className="meta">{t("grammarIntro")}</p>
        <p className="mt-4 text-[18px] leading-relaxed whitespace-pre-line" lang={locale}>{summary}</p>
      </ShellBody>
      <ShellFooter><Button onClick={onContinue}>{actions("continue")}</Button></ShellFooter>
    </>
  );
}

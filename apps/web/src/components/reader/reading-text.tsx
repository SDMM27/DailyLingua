"use client";

import { languageDisplayName } from "@dailylingua/core";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import type { ReaderWord } from "@/lib/reader/words";

export function ReadingText({ userId, textId, body, language, words }: {
  userId: string; textId: string; body: string; language: string; words: ReaderWord[];
}) {
  const t = useTranslations("reader");
  const locale = useLocale();
  const actions = useTranslations("common.actions");
  const [selected, setSelected] = useState<ReaderWord>();
  const [saved, setSaved] = useState<Set<number>>(() => new Set());
  const [failed, setFailed] = useState<number>();
  const [pending, startTransition] = useTransition();
  const comparison = selected?.comparison;
  const comparisonLabel = comparison && t(comparison.kind, { language: languageDisplayName(comparison.sourceLanguage, locale) });

  function save(word: ReaderWord) {
    setFailed(undefined);
    startTransition(async () => {
      try {
        const response = await fetch("/api/reader/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json", [ACCOUNT_HEADER]: userId },
          body: JSON.stringify({ textId, from: word.from }),
        });
        if (response.status === 204) {
          setSaved((previous) => new Set([...previous, word.from]));
          return;
        }
      } catch {
        // A network failure can be retried without duplicating the card.
      }
      setFailed(word.from);
    });
  }

  return (
    <>
      <article className="whitespace-pre-wrap break-words text-lg leading-relaxed" lang={language} dir="auto">
        {words.map((word, index) => (
          <Fragment key={word.from}>
            {body.slice(words[index - 1]?.to ?? 0, word.from)}
            <button type="button" className="inline cursor-pointer rounded-sm text-accent-strong underline decoration-dotted underline-offset-4"
              aria-pressed={selected?.from === word.from} onClick={() => setSelected(word)}>
              {body.slice(word.from, word.to)}
            </button>
          </Fragment>
        ))}
        {body.slice(words.at(-1)?.to ?? 0)}
      </article>
      {selected && (
        <section className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] mt-6 space-y-3 rounded-card border border-line bg-surface p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div aria-live="polite">
              <h2 className="sd-display break-words text-2xl" lang={language} dir="auto">{selected.front}</h2>
              <p lang={selected.meaningLanguage} dir="auto">{selected.meaning}</p>
            </div>
            <Button variant="ghost" className="shrink-0 px-3 text-inherit!" aria-label={actions("close")} onClick={() => setSelected(undefined)}>×</Button>
          </div>
          <p className="text-sm text-muted" lang={language} dir="auto">{selected.context}</p>
          {comparison && (
            <aside aria-label={comparisonLabel}
              className="space-y-1 border-t border-line pt-3 text-sm">
              <p className="font-semibold">{comparisonLabel}</p>
              <p><span lang={comparison.sourceLanguage}>{comparison.sourceWord}</span>
                {comparison.sourceMeaning && <> · <span lang={comparison.sourceMeaning.language}>{comparison.sourceMeaning.text}</span></>}
              </p>
              {comparison.sourceExample && <p lang={comparison.sourceLanguage} dir="auto" className="text-muted">{comparison.sourceExample}</p>}
            </aside>
          )}
          {saved.has(selected.from) ? <p role="status">{t("saved")}</p> : (
            <Button disabled={pending} onClick={() => save(selected)}>{t(pending ? "saving" : "add")}</Button>
          )}
          {failed === selected.from && <p role="alert">{t("failed")}</p>}
        </section>
      )}
    </>
  );
}

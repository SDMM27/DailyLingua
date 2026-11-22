"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState, useTransition } from "react";
import { addReaderCard } from "@/app/actions/reader";
import { Button } from "@/components/ui/button";
import type { ReaderWord } from "@/lib/reader/words";

export function ReadingText({ textId, body, language, words }: {
  textId: string; body: string; language: string; words: ReaderWord[];
}) {
  const t = useTranslations("reader");
  const actions = useTranslations("common.actions");
  const [selected, setSelected] = useState<ReaderWord>();
  const [saved, setSaved] = useState<Set<number>>(() => new Set());
  const [failed, setFailed] = useState<number>();
  const [pending, startTransition] = useTransition();

  function save(word: ReaderWord) {
    setFailed(undefined);
    startTransition(async () => {
      try {
        if (await addReaderCard({ textId, from: word.from })) {
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
            <Button variant="ghost" className="shrink-0 px-3" aria-label={actions("close")} onClick={() => setSelected(undefined)}>×</Button>
          </div>
          <p className="text-sm text-muted" lang={language} dir="auto">{selected.context}</p>
          {saved.has(selected.from) ? <p role="status">{t("saved")}</p> : (
            <Button disabled={pending} onClick={() => save(selected)}>{t(pending ? "saving" : "add")}</Button>
          )}
          {failed === selected.from && <p role="alert">{t("failed")}</p>}
        </section>
      )}
    </>
  );
}

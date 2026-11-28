"use client";

import { PLACEMENT_GAP, type PlacementItem } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useId, useRef } from "react";
import { OptionGroup } from "./option-group";

/** The prompt of a grammar or vocabulary question: its gap is a blank that shows the option picked. */
function GappedPrompt({ text, filled }: { text: string; filled: string | null }) {
  const t = useTranslations("placement.question");
  const parts = text.split(PLACEMENT_GAP);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <>
              <span aria-hidden="true" className="mx-1 inline-block min-w-14 border-b-2 border-lang px-2 text-center text-lang">{filled ?? "…"}</span>
              <span className="sr-only">{t("blank")}</span>
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * One question: its meta line (announced politely when the question changes), the prompt (with the passage for a reading
 * question) and the four answers. The prompt takes the focus when the question changes.
 */
export function PlacementQuestion({ item, number, language, selected, onSelect }: {
  item: PlacementItem;
  /** 1-based rank of the question in the test. */
  number: number;
  language: string;
  selected: number | null;
  onSelect(index: number): void;
}) {
  const t = useTranslations("placement.question");
  const promptId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const reading = item.skill === "reading";

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [item.id]);

  return (
    <div>
      <p className="meta" aria-live="polite">{t("meta", { number, skill: t(`skills.${item.skill}`) })}</p>
      {reading && item.context !== undefined && (
        <p lang={language} dir="auto" className="mt-3 mb-5 rounded-2xl bg-lang-soft p-5 font-display text-xl leading-[1.65]">{item.context}</p>
      )}
      <h2
        id={promptId}
        ref={heading}
        tabIndex={-1}
        lang={language}
        dir="auto"
        className={`font-display font-medium outline-none ${reading ? "mb-4 text-2xl leading-snug" : "mt-3 mb-6 text-[30px] leading-[1.35]"}`}
      >
        {reading ? item.prompt : <GappedPrompt text={item.prompt} filled={selected === null ? null : (item.options[selected] ?? null)} />}
      </h2>
      <OptionGroup labelledBy={promptId} options={item.options} value={selected} language={language} columns={reading ? 1 : 2} onChange={onSelect} />
    </div>
  );
}

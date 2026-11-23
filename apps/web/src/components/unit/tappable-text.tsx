"use client";

import { useTranslations } from "next-intl";
import { Fragment } from "react";
import type { Gloss, Segment } from "@/lib/units/words";
import { Icon } from "./icons";

export interface PickedWord {
  /** The word as written in the line. */
  text: string;
  gloss: Gloss;
  /** The line it was touched in (the context of the panel). */
  context: string;
}

/** A line of the target language whose glossed words are buttons. New words of the unit carry the marker. */
export function TappableText({ segments, context, selected, muted = false, onWord }: {
  segments: Segment[];
  context: string;
  selected: string | null;
  muted?: boolean;
  onWord(word: PickedWord): void;
}) {
  const t = useTranslations("dialogue");
  return (
    <>
      {segments.map((segment, index) => {
        const { gloss } = segment;
        if (!gloss) return <Fragment key={index}>{segment.text}</Fragment>;
        const key = `${context}\u0000${index}`;
        return (
          <button
            key={index}
            type="button"
            aria-pressed={selected === key}
            aria-label={gloss.isNew ? t("wordNew", { word: segment.text }) : undefined}
            onClick={() => onWord({ text: segment.text, gloss, context: key })}
            className={`inline cursor-pointer rounded-[3px] px-px text-start font-[inherit] leading-[inherit] ${muted ? "text-muted" : "text-ink"} ${gloss.isNew ? "border-b-2 border-dotted border-word-new-line bg-word-new" : ""} ${selected === key ? "outline-2 outline-offset-1 outline-accent" : ""}`}
          >
            {segment.text}
          </button>
        );
      })}
    </>
  );
}

/**
 * The card of a touched word: the word, its lemma, its meaning in the explanation language, a note, and the line it
 * came from. (Adding it to the reviews comes with the key phrases, not here.)
 */
export function WordPanel({ picked, language, locale, line, onClose }: {
  picked: PickedWord;
  language: string;
  locale: "fr" | "en";
  line: string;
  onClose(): void;
}) {
  const t = useTranslations("dialogue");
  const actions = useTranslations("common.actions");
  const { gloss } = picked;
  const lemma = gloss.lemma.toLowerCase() === picked.text.toLowerCase() ? null : gloss.lemma;
  return (
    <section aria-label={t("wordPanel")} aria-live="polite" className="rounded-card border border-border-strong bg-surface p-4 shadow-lg">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-tight font-bold" lang={language} dir="auto">{picked.text}</p>
          {lemma && <p className="meta mt-1" lang={language}>{lemma}</p>}
        </div>
        <button type="button" aria-label={actions("close")} onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full">
          <Icon name="close" />
        </button>
      </div>
      <p className="mt-1 text-[17px] font-semibold" lang={locale}>{gloss.meaning[locale]}</p>
      {gloss.note && <p className="mt-1.5 text-sm text-muted" lang={locale}>{gloss.note[locale]}</p>}
      <p className="mt-1.5 text-sm text-muted" lang={language} dir="auto">{line}</p>
    </section>
  );
}

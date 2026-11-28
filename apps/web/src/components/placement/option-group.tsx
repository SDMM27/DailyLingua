"use client";

import { useRef, type KeyboardEvent } from "react";

const LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Four answers as a radio group (arrow keys move and select, one tab stop). `labelledBy` names the group by the
 * prompt. Each option is a tile with its letter; no right or wrong feedback during the test.
 */
export function OptionGroup({ labelledBy, options, value, language, columns, onChange }: {
  labelledBy: string;
  options: readonly string[];
  value: number | null;
  language: string;
  /** Two columns from 900 px (the short grammar answers); reading answers stay in one. */
  columns: 1 | 2;
  onChange(index: number): void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(next);
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={`grid gap-3 ${columns === 2 ? "min-[900px]:grid-cols-2" : ""}`}>
      {options.map((option, index) => {
        const selected = value === index;
        return (
          <button
            key={index}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (value === null && index === 0) ? 0 : -1}
            lang={language}
            dir="auto"
            onClick={() => onChange(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex min-h-[60px] w-full items-center gap-3.5 rounded-2xl border-[1.5px] px-4 py-2 text-start font-display text-[19px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lang ${selected ? "border-lang bg-lang-soft" : "border-line bg-bg hover:border-border-strong"}`}
          >
            <b aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full font-sans text-[13px] font-semibold ${selected ? "bg-lang text-on-lang" : "bg-surface-2 text-muted"}`}>{LETTERS[index]}</b>
            <span className="min-w-0 break-words">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

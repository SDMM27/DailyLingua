"use client";

import { CheckIcon, PlusIcon } from "@/components/icons";
import type { Language } from "@/lib/schemas/common";
import type { Expression } from "@/lib/schemas/mission";

export function ExpressionList({
  language,
  expressions,
  saved,
  onSave,
}: {
  language: Language;
  expressions: Expression[];
  saved: ReadonlySet<string>;
  /** Adds the expression to the vocabulary. A saved expression stays there: it is managed in "Mots". */
  onSave: (expressionId: string) => void;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {expressions.map((e) => {
        const isSaved = saved.has(e.id);
        return (
          <li key={e.id} className="flex items-start gap-2 py-3.5">
            <div className="min-w-0 flex-1">
              <p lang={language} className="font-serif text-lg leading-snug font-bold">
                <span className="bg-marker box-decoration-clone px-1">{e.text}</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">{e.translation}</p>
              <p lang={language} className="mt-1.5 font-serif-italic text-[15px] text-ink-soft italic">
                {e.example}
              </p>
              {e.note && <p className="mt-1 text-xs text-muted">{e.note}</p>}
            </div>
            <button
              type="button"
              onClick={() => onSave(e.id)}
              disabled={isSaved}
              aria-label={isSaved ? `« ${e.text} » est dans tes mots` : `Ajouter « ${e.text} » aux mots`}
              className="-my-1 grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface-sunk disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span
                className={`grid size-8 place-items-center rounded-full border transition-colors ${
                  isSaved ? "border-ink bg-ink text-paper" : "border-line text-ink-soft"
                }`}
              >
                {isSaved ? <CheckIcon width={16} height={16} /> : <PlusIcon width={16} height={16} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

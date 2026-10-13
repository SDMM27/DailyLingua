"use client";

import { CheckIcon, PlusIcon } from "@/components/icons";
import type { Language } from "@/lib/schemas/common";
import type { Expression } from "@/lib/schemas/mission";

export function ExpressionList({
  language,
  expressions,
  saved,
  onToggleSave,
}: {
  language: Language;
  expressions: Expression[];
  saved: ReadonlySet<string>;
  onToggleSave: (expressionId: string) => void;
}) {
  return (
    <ul className="divide-y divide-line">
      {expressions.map((e) => {
        const isSaved = saved.has(e.id);
        return (
          <li key={e.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p lang={language} className="font-serif text-[17px] font-semibold">
                {e.text}
              </p>
              <p className="text-sm text-ink-soft">{e.translation}</p>
              <p lang={language} className="mt-1.5 font-serif-italic text-[15px] text-ink-soft italic">
                {e.example}
              </p>
              {e.note && <p className="mt-1 text-xs text-muted">{e.note}</p>}
            </div>
            <button
              type="button"
              onClick={() => onToggleSave(e.id)}
              aria-pressed={isSaved}
              aria-label={isSaved ? `Retirer « ${e.text} » des mots` : `Ajouter « ${e.text} » aux mots`}
              className={`grid size-9 shrink-0 place-items-center rounded-full border transition-colors ${
                isSaved ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink-soft"
              }`}
            >
              {isSaved ? <CheckIcon width={16} height={16} /> : <PlusIcon width={16} height={16} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

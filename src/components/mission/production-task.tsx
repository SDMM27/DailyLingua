"use client";

import { useId, useState } from "react";
import { MicIcon, PenIcon } from "@/components/icons";
import type { Language } from "@/lib/schemas/common";
import type { ProductionTask as ProductionTaskData } from "@/lib/schemas/mission";

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
}

export function ProductionTask({ language, task }: { language: Language; task: ProductionTaskData }) {
  const [text, setText] = useState("");
  const textareaId = useId();
  const Icon = task.mode === "writing" ? PenIcon : MicIcon;

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <Icon width={15} height={15} />
        {task.mode === "writing" ? "Production écrite" : "Production orale"}
        {task.targetLength && <span className="font-normal normal-case">· {task.targetLength}</span>}
      </p>
      <p lang={language} className="mt-2 font-serif text-[17px] leading-relaxed">
        {task.prompt}
      </p>
      <ul className="mt-3 space-y-1.5">
        {task.hints.map((hint) => (
          <li key={hint} className="flex gap-2 text-[13px] leading-relaxed text-ink-soft">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
            {hint}
          </li>
        ))}
      </ul>

      {task.mode === "writing" ? (
        <div className="mt-4">
          <label htmlFor={textareaId} className="sr-only">
            Ton texte
          </label>
          <textarea
            id={textareaId}
            lang={language}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Écris ici…"
            className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 font-serif leading-relaxed placeholder:text-muted focus:border-ink-soft focus:outline-none"
          />
          <p className="mt-1.5 text-right text-xs text-muted">{countWords(text)} mots</p>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-3 text-[13px] leading-relaxed text-muted">
          Enregistre-toi avec le dictaphone de ton téléphone pour l’instant. L’enregistrement et le retour
          automatique dans l’app arriveront avec l’intégration IA.
        </p>
      )}
    </div>
  );
}

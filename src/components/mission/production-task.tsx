"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MicIcon, PenIcon } from "@/components/icons";
import type { Language } from "@/lib/schemas/common";
import type { ProductionTask as ProductionTaskData } from "@/lib/schemas/mission";

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
}

/** Quiet time after the last keystroke before the text is saved. */
const SAVE_DELAY_MS = 800;

type SaveStatus = "idle" | "saving" | "saved" | "error";

const STATUS_LABELS: Record<SaveStatus, string> = {
  idle: "",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Non enregistré",
};

/**
 * `onSave` is given when the text can be saved (signed-in user): it is called shortly after the
 * user stops typing and resolves to whether the text was saved. In the demo it is left out.
 */
export function ProductionTask({
  language,
  task,
  initialText = "",
  onSave,
}: {
  language: Language;
  task: ProductionTaskData;
  initialText?: string;
  onSave?: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const lastSaved = useRef(initialText);
  const latest = useRef({ text, onSave });
  const textareaId = useId();

  useEffect(() => {
    latest.current = { text, onSave };
  });

  const canSave = Boolean(onSave);
  useEffect(() => {
    if (!canSave || text === lastSaved.current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("saving");
      const ok = await latest.current.onSave!(text);
      if (ok) lastSaved.current = text;
      if (!cancelled) setStatus(ok ? "saved" : "error");
    }, SAVE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, canSave]);

  // Leaving the page within the delay must not lose the last words.
  useEffect(
    () => () => {
      const { text: current, onSave: save } = latest.current;
      if (save && current !== lastSaved.current) void save(current);
    },
    [],
  );
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
          <p className="mt-1.5 flex justify-between text-xs text-muted">
            <span role="status" className={status === "error" ? "text-danger" : ""}>
              {STATUS_LABELS[status]}
            </span>
            <span>{countWords(text)} mots</span>
          </p>
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

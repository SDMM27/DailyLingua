"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MicIcon, PenIcon } from "@/components/icons";
import type { Language } from "@/lib/schemas/common";
import { MAX_PRODUCTION_LENGTH, type ProductionTask as ProductionTaskData } from "@/lib/schemas/mission";
import {
  meaningfulLength,
  WRITING_FEEDBACK_LIMITS,
  type WritingFeedbackResult,
  type WritingReviewState,
} from "@/lib/schemas/writing-feedback";
import { WritingFeedbackCard } from "./writing-feedback-card";

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
}

/** Quiet time after the last keystroke before the text is saved. */
const SAVE_DELAY_MS = 800;

/** The character counter shows once the text passes this share of the limit. */
const COUNTER_THRESHOLD = 0.8;

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
 * `onRequestFeedback` is given when the text can also be reviewed: it saves the text, ticks the
 * writing step and resolves to the review (null if the request itself failed).
 */
export function ProductionTask({
  language,
  task,
  initialText = "",
  onSave,
  onRequestFeedback,
  initialReview,
}: {
  language: Language;
  task: ProductionTaskData;
  initialText?: string;
  onSave?: (text: string) => Promise<boolean>;
  onRequestFeedback?: (text: string) => Promise<WritingFeedbackResult | null>;
  initialReview?: WritingReviewState;
}) {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [review, setReview] = useState<WritingReviewState | null>(initialReview ?? null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
      // A review request may have saved this text meanwhile: an older save must not overwrite it.
      if (lastSaved.current === text) return;
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

  async function handleRequestFeedback() {
    if (!onRequestFeedback || loading) return;
    const body = text;
    setLoading(true);
    setNotice(null);
    const result = await onRequestFeedback(body);
    setLoading(false);
    if (!result) return;
    // The server saved the text it was sent.
    lastSaved.current = body;
    setStatus("saved");
    if (result.status === "ready") {
      setReview({ feedback: result.feedback, reviewedText: result.reviewedText, attemptsLeft: result.attemptsLeft });
      return;
    }
    const attemptsLeft = result.status === "limit" ? 0 : result.attemptsLeft;
    setReview((r) => ({ feedback: r?.feedback ?? null, reviewedText: r?.reviewedText ?? null, attemptsLeft }));
    setNotice(
      result.status === "limit"
        ? `Tu as utilisé les ${WRITING_FEEDBACK_LIMITS.attemptsPerSession} corrections de ce texte.`
        : "La correction n’est pas disponible pour l’instant. Ton texte est enregistré et l’étape est cochée.",
    );
  }

  const attemptsLeft = review?.attemptsLeft ?? WRITING_FEEDBACK_LIMITS.attemptsPerSession;
  const tooShort = meaningfulLength(text) < WRITING_FEEDBACK_LIMITS.minChars;
  const alreadyReviewed = review?.reviewedText != null && text === review.reviewedText;
  const outdated = Boolean(review?.feedback) && !alreadyReviewed;
  const canRequest = !tooShort && !loading && attemptsLeft > 0 && !alreadyReviewed;
  const showCounter = text.length > MAX_PRODUCTION_LENGTH * COUNTER_THRESHOLD;
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
            maxLength={MAX_PRODUCTION_LENGTH}
            readOnly={loading}
            placeholder="Écris ici…"
            className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 font-serif leading-relaxed placeholder:text-muted focus:border-ink-soft focus:outline-none"
          />
          <p className="mt-1.5 flex justify-between gap-3 text-xs text-muted">
            <span role="status" className={status === "error" ? "text-danger" : ""}>
              {STATUS_LABELS[status]}
            </span>
            <span>
              {showCounter && `${text.length} / ${MAX_PRODUCTION_LENGTH} caractères · `}
              {countWords(text)} mots
            </span>
          </p>

          {onRequestFeedback && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void handleRequestFeedback()}
                disabled={!canRequest}
                className="w-full rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-paper transition-opacity disabled:opacity-40"
              >
                {outdated
                  ? `Corriger à nouveau (${attemptsLeft} restante${attemptsLeft > 1 ? "s" : ""})`
                  : "Terminer et obtenir une correction"}
              </button>
              {tooShort && !loading && (
                <p className="mt-2 text-xs text-muted">Écris au moins quelques phrases pour obtenir une correction.</p>
              )}
              {loading && (
                <p role="status" className="mt-2 text-sm text-ink-soft">
                  Correction en cours…
                </p>
              )}
              {notice && !loading && <p className="mt-2 text-sm text-ink-soft">{notice}</p>}
            </div>
          )}

          {review?.feedback && (
            <div className="mt-5 rounded-2xl bg-surface-sunk px-4 py-4">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Correction</p>
              {outdated && (
                <p className="mb-3 text-[13px] text-ink-soft">
                  Cette correction porte sur une version précédente de ton texte.
                </p>
              )}
              <WritingFeedbackCard language={language} feedback={review.feedback} />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-3 text-[13px] leading-relaxed text-muted">
          Enregistre-toi avec le dictaphone de ton téléphone pour l’instant : l’enregistrement dans l’app
          arrivera plus tard.
        </p>
      )}
    </div>
  );
}

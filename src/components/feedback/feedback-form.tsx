"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { sendFeedback } from "@/app/actions/feedback";
import { Card } from "@/components/ui/primitives";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_MESSAGE_MAX,
  type FeedbackCategory,
} from "@/lib/schemas/feedback";

/** `persist` is false in the demo: nothing can be sent, the form is shown disabled with an explanation. */
export function FeedbackForm({ persist, page }: { persist: boolean; page?: string }) {
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const messageId = useId();

  if (sent) {
    return (
      <Card role="status" className="text-center">
        <h2 className="font-serif text-2xl font-semibold">Merci !</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Ton retour est bien arrivé. C’est grâce à toi que l’app s’améliore.
        </p>
        <Link href="/" className="mt-5 inline-block rounded-2xl bg-ink px-6 py-3 font-semibold text-paper">
          Retour à l’accueil
        </Link>
      </Card>
    );
  }

  const disabled = !persist || pending;
  const canSend = persist && !pending && message.trim().length >= 3;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    setError(null);
    startTransition(async () => {
      const result = await sendFeedback({ category, message, page });
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {!persist && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-2.5 text-sm leading-relaxed text-muted">
          Mode démonstration : l’envoi de retours est désactivé. Il fonctionne avec un compte.
        </p>
      )}

      <fieldset disabled={disabled} className="min-w-0">
        <legend className="mb-2 text-sm font-semibold">De quoi s’agit-il ?</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_CATEGORIES.map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="category"
                value={value}
                checked={category === value}
                onChange={() => setCategory(value)}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:opacity-50">
                {FEEDBACK_CATEGORY_LABELS[value]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={messageId} className="mb-2 block text-sm font-semibold">
          Ton message
        </label>
        <textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          maxLength={FEEDBACK_MESSAGE_MAX}
          rows={7}
          className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-base leading-relaxed focus:border-ink-soft focus:outline-none disabled:opacity-60"
        />
        <p className="mt-1 text-right text-xs text-muted" aria-live="off">
          {message.length} / {FEEDBACK_MESSAGE_MAX}
        </p>
      </div>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSend}
        className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}

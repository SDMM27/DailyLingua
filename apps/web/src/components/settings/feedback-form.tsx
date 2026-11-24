"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { sendFeedbackAction, type FeedbackState } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, FormMessage, SelectField } from "@/components/ui/field";

/** Same values as `feedbackCategories` of the data package (the client bundle does not import it). */
const CATEGORIES = ["bug", "idee", "contenu", "autre"] as const;

/** "Signaler un problème": category, message, send. The page and the version travel with it. */
export function FeedbackForm() {
  const t = useTranslations("settings.feedback");
  const te = useTranslations("errors");
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(sendFeedbackAction, { attempt: 0 });

  return (
    <form action={formAction} className="space-y-5">
      <p className="text-sm text-muted">{t("intro")}</p>
      {/* A new key after every answer: the fields start again from what the server sent back. */}
      <div key={state.attempt} className="space-y-5">
        <SelectField label={t("categoryLabel")} name="category" defaultValue={state.category ?? "bug"} disabled={pending}>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </SelectField>
        <div className="space-y-2">
          <label htmlFor="feedback-message" className="block text-sm font-semibold text-ink">
            {t("messageLabel")}
          </label>
          <textarea
            id="feedback-message"
            name="message"
            defaultValue={state.message ?? ""}
            required
            minLength={3}
            maxLength={2000}
            rows={5}
            disabled={pending}
            aria-describedby="feedback-message-hint"
            className={`${CONTROL_CLASS} min-h-32 py-3`}
          />
          <p id="feedback-message-hint" className="text-sm text-muted">
            {t("messageHint")}
          </p>
        </div>
      </div>
      <input type="hidden" name="page" value={pathname} />
      {state.error && <FormMessage kind="error">{te(state.error)}</FormMessage>}
      {state.sent && <FormMessage kind="notice">{t("sent")}</FormMessage>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}

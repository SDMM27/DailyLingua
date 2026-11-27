"use client";

import { immersionKinds, type ImmersionKind } from "@dailylingua/schemas";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { ChoiceList } from "@/components/onboarding/choice-list";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, FormMessage } from "@/components/ui/field";
import { ACCOUNT_HEADER } from "@/lib/offline/account";

export interface ImmersionItem {
  id: string;
  day: string;
  minutes: number;
  kind: ImmersionKind;
}

type Editing = { id: string | null; day: string; minutes: string; kind: ImmersionKind };

/**
 * "Immersion" block of the progress page: the week's learning time (in the app and, apart, declared by the
 * learner), a simple form to declare time outside the app, and the week's entries to edit or delete.
 */
export function ImmersionSection({ userId, language, today, oldestDay, appMinutes, declaredMinutes, entries }: {
  userId: string;
  language: string;
  today: string;
  oldestDay: string;
  appMinutes: number;
  declaredMinutes: number;
  entries: ImmersionItem[];
}) {
  const t = useTranslations("progress.immersion");
  const locale = useLocale();
  const router = useRouter();
  const formId = useId();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const duration = (total: number) => {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    if (hours === 0) return t("durationMinutes", { minutes });
    return minutes === 0 ? t("durationHours", { hours }) : t("durationHoursMinutes", { hours, minutes });
  };
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const describe = (entry: ImmersionItem) => `${dayFormat.format(new Date(entry.day))} · ${t(`kinds.${entry.kind}`)} · ${duration(entry.minutes)}`;

  /** Sends a request, then refreshes the page; a refusal or a network failure leaves the screen as it was, with a message. */
  function send(url: string, method: string, body: object | null, done: () => void) {
    setFailed(false);
    startTransition(async () => {
      try {
        const response = await fetch(url, {
          method,
          headers: { [ACCOUNT_HEADER]: userId, ...(body ? { "Content-Type": "application/json" } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (response.ok) {
          done();
          router.refresh();
          return;
        }
      } catch {
        // A network failure is reported like a refusal; nothing was changed.
      }
      setFailed(true);
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const body = { language, day: editing.day, minutes: Number(editing.minutes), kind: editing.kind };
    send(editing.id ? `/api/immersion/${editing.id}` : "/api/immersion", editing.id ? "PATCH" : "POST", body, () => setEditing(null));
  }

  const start = (entry?: ImmersionItem) => {
    setFailed(false);
    setConfirming(null);
    setEditing(entry
      ? { id: entry.id, day: entry.day, minutes: String(entry.minutes), kind: entry.kind }
      : { id: null, day: today, minutes: "", kind: "video" });
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-4 md:col-start-1 md:row-start-2" aria-labelledby="progress-immersion">
      <h2 id="progress-immersion" className="font-display text-2xl font-semibold">{t("title")}</h2>
      <p className="mt-2" data-testid="immersion-summary">
        {t("summaryLabel")} <span className="font-semibold">{t("inApp", { duration: duration(appMinutes) })}</span>
        {" · "}
        <span className="text-muted">{t("declared", { duration: duration(declaredMinutes) })}</span>
      </p>

      {editing ? (
        <form onSubmit={submit} className="mt-5 space-y-5" aria-labelledby={`${formId}-title`}>
          <h3 id={`${formId}-title`} className="font-semibold">{t(editing.id ? "editTitle" : "addTitle")}</h3>
          <div className="space-y-2">
            <label htmlFor={`${formId}-day`} className="block text-sm font-semibold">{t("dayLabel")}</label>
            <input id={`${formId}-day`} type="date" required min={oldestDay} max={today} value={editing.day} disabled={pending}
              onChange={(event) => setEditing({ ...editing, day: event.target.value })} className={CONTROL_CLASS} />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${formId}-minutes`} className="block text-sm font-semibold">{t("minutesLabel")}</label>
            <input id={`${formId}-minutes`} type="number" inputMode="numeric" required min={1} max={600} step={1} value={editing.minutes} disabled={pending}
              onChange={(event) => setEditing({ ...editing, minutes: event.target.value })} className={CONTROL_CLASS} />
          </div>
          <div className="space-y-2">
            <p id={`${formId}-kind`} className="text-sm font-semibold">{t("kindLabel")}</p>
            <ChoiceList name={`${formId}-kind`} labelledBy={`${formId}-kind`} value={editing.kind}
              onChange={(kind) => setEditing({ ...editing, kind: kind as ImmersionKind })}
              choices={immersionKinds.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))} />
          </div>
          {failed && <FormMessage kind="error">{t("failed")}</FormMessage>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending} className="sm:w-auto">{t("save")}</Button>
            <Button variant="secondary" disabled={pending} onClick={() => setEditing(null)}>{t("cancel")}</Button>
          </div>
        </form>
      ) : (
        <>
          <Button variant="secondary" className="mt-4" onClick={() => start()}>{t("add")}</Button>
          {failed && <div className="mt-3"><FormMessage kind="error">{t("failed")}</FormMessage></div>}
        </>
      )}

      {entries.length === 0 ? <p className="mt-4 text-sm text-muted">{t("empty")}</p> : (
        <ul className="mt-4 divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
              <span>{describe(entry)}</span>
              {confirming === entry.id ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{t("confirmDelete")}</span>
                  <Button variant="ghost" disabled={pending} aria-label={t("confirmDeleteEntry", { entry: describe(entry) })}
                    onClick={() => send(`/api/immersion/${entry.id}`, "DELETE", null, () => setConfirming(null))}>{t("confirm")}</Button>
                  <Button variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>{t("cancel")}</Button>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Button variant="ghost" aria-label={t("editEntry", { entry: describe(entry) })} onClick={() => start(entry)}>{t("edit")}</Button>
                  <Button variant="ghost" aria-label={t("deleteEntry", { entry: describe(entry) })}
                    onClick={() => { setEditing(null); setConfirming(entry.id); }}>{t("delete")}</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

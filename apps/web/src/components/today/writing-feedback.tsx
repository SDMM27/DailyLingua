"use client";

import { WRITING_CRITERIA } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { EventSyncApi } from "@/components/pwa/event-sync-provider";
import { Button } from "@/components/ui/button";
import type { LocalWritingFeedback } from "@/lib/offline/feedback";
import { RewriteTask } from "./rewrite-task";

export function WritingFeedback({ sync, sessionId, language, paused = false }: {
  sync: EventSyncApi; sessionId?: string; language: string; paused?: boolean;
}) {
  const t = useTranslations("writingFeedback");
  const x = useTranslations("expression");
  const [task, setTask] = useState<LocalWritingFeedback>();

  useEffect(() => {
    let active = true;
    function read() {
      void sync.readWritingFeedback().then((tasks) => {
        if (!active) return;
        const latest = tasks.filter((entry) => !sessionId || entry.sessionId === sessionId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
        setTask(latest);
      }).catch(() => undefined);
    }
    const stop = sync.subscribeWritingFeedback(read);
    read();
    return () => {
      active = false;
      stop();
    };
  }, [sessionId, sync]);

  if (!task) return null;
  const result = task.response;
  if (result?.status !== "ready") {
    const status = result?.status ?? "pending";
    const message = status === "invalid_production" || status === "not_found" ? "unsent"
      : status === "forbidden" || status === "unauthenticated" ? "pending" : status;
    return (
      <section className="space-y-3 rounded-card border border-line bg-surface p-4">
        <h2 className="sd-display text-xl">{t("title")}</h2>
        <p className="text-muted" role="status">{t(message)}</p>
        {(status === "limit" || status === "disabled" || status === "unavailable") && (
          <Button variant="secondary" onClick={sync.refreshWritingFeedback}>{t("retry")}</Button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-card border border-line bg-surface p-4">
      <h2 className="sd-display text-xl">{t("title")}</h2>
      {task.spoken && (
        <div className="space-y-1">
          <p className="meta">{x("practice")}</p>
          <p className="text-sm text-muted">{x("understoodTitle")}</p>
          <p className="whitespace-pre-wrap break-words" lang={language} dir="auto">{task.spoken.transcript}</p>
        </div>
      )}
      <p lang={result.explanationLanguage} dir="auto">{result.feedback.strength}</p>
      <details className="space-y-3">
        <summary className="min-h-11 cursor-pointer py-2">{t("details")}</summary>
        <dl className="space-y-2">
          {WRITING_CRITERIA.map((criterion) => (
            <div key={criterion}>
              <dt className="font-medium">{t(`scores.${criterion}`)} · {result.feedback.scores[criterion].score}/5</dt>
              <dd className="break-words text-muted" lang={result.explanationLanguage} dir="auto">{result.feedback.scores[criterion].comment}</dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-4">
          {result.feedback.corrections.map((correction, index) => (
            <li key={index} className="space-y-1 break-words">
              <p dir="auto"><del>{correction.original}</del></p>
              <p dir="auto"><strong>{correction.corrected}</strong></p>
              <p className="text-muted" lang={result.explanationLanguage} dir="auto">{correction.explanation}</p>
            </li>
          ))}
        </ul>
        <p className="whitespace-pre-wrap break-words" dir="auto">{result.feedback.nativeVersion}</p>
      </details>
      {result.errorOfTheDay && (
        <aside className="space-y-1 border-t border-line pt-3">
          <h3 className="font-medium">{t("errorOfTheDay")}</h3>
          <p className="break-words text-muted" lang={result.explanationLanguage} dir="auto">{result.errorOfTheDay.explanation}</p>
        </aside>
      )}
      {result.sentences.map((sentence, index) => (
        <RewriteTask key={`${task.productionId}:${index}`} sync={sync} productionId={task.productionId}
          sentence={sentence} index={index} language={language} attemptId={task.attempts?.[index]} paused={paused} />
      ))}
    </section>
  );
}

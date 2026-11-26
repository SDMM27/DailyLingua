"use client";

import { MAX_REWRITE_CHARS, type WritingFeedbackResponse } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { EventSyncApi } from "@/components/pwa/event-sync-provider";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { useOnlineStatus } from "@/lib/offline/online-status";
import { useRecognition } from "@/lib/speech/use-recognition";
import { useSpeechPrivacy } from "./speech-privacy";

const resultSchema = z.object({ accepted: z.boolean() });
type Sentence = Extract<WritingFeedbackResponse, { status: "ready" }>["sentences"][number];
type Outcome = "accepted" | "tryAgain" | "rewriteUnsent";

export function RewriteTask({ sync, productionId, sentence, index, language, attemptId, paused }: {
  sync: EventSyncApi;
  productionId: string;
  sentence: Sentence;
  index: number;
  /** The studied language, for the optional microphone. */
  language: string;
  attemptId?: string;
  paused: boolean;
}) {
  const t = useTranslations("writingFeedback");
  const x = useTranslations("expression");
  const online = useOnlineStatus();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const privacy = useSpeechPrivacy();
  // The dictation fills the field; the learner can still touch it up.
  const recognition = useRecognition(language, { onFinal: (heard) => setText(heard) });
  const listening = recognition.status === "listening";
  const stopRecognition = recognition.stop;
  const [settled, setSettled] = useState<{ id: string; outcome: Outcome }>();
  const outcome = settled?.id === attemptId ? settled?.outcome : undefined;
  const pending = Boolean(attemptId && !outcome);
  const draft = text.trim();
  const tooLong = draft.length > MAX_REWRITE_CHARS;
  const canSubmit = !paused && !listening && !pending && !submitting && outcome !== "accepted" && draft !== "" && !tooLong;

  useEffect(() => {
    if (paused && listening) stopRecognition();
  }, [listening, paused, stopRecognition]);

  useEffect(() => {
    if (!attemptId || !pending || !online) return;
    const controller = new AbortController();
    let timer: number;
    async function check(id: string) {
      try {
        const delivery = await sync.eventDelivery(id);
        if (controller.signal.aborted) return;
        if (delivery === "rejected") {
          setSettled({ id, outcome: "rewriteUnsent" });
          return;
        }
        if (delivery === "delivered") {
          const response = await fetch(`/api/production/${productionId}/rewrites?event=${id}`, {
            credentials: "same-origin", cache: "no-store", headers: { [ACCOUNT_HEADER]: sync.userId },
            signal: controller.signal,
          });
          if (response.ok) {
            const result = resultSchema.parse(await response.json());
            if (!controller.signal.aborted) {
              setSettled({ id, outcome: result.accepted ? "accepted" : "tryAgain" });
              return;
            }
          }
        }
      } catch { /* Retry while the response is unavailable. */ }
      if (!controller.signal.aborted) timer = window.setTimeout(() => { void check(id); }, 2_000);
    }
    void check(attemptId);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [attemptId, online, pending, productionId, sync]);

  return (
    <form className="space-y-2 border-t border-line pt-3" onSubmit={async (event) => {
      event.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      setError(false);
      try {
        await sync.enqueueRewrite(productionId, index, draft);
        setText("");
      } catch {
        setError(true);
      } finally {
        setSubmitting(false);
      }
    }}>
      <p dir="auto" className="break-words">{sentence.text}</p>
      {outcome !== "accepted" && !pending && (
        <>
          <label className="block">
            <span>{t("rewriteLabel", { index: index + 1 })}</span>
            <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={MAX_REWRITE_CHARS}
              dir="auto" lang={language} className="mt-1 min-h-24 w-full rounded-xl border border-line bg-surface p-3 text-[17px]" />
          </label>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" className="flex-1" disabled={!canSubmit}>{t("checkRewrite")}</Button>
            {recognition.status !== "unavailable" && (
              <button
                type="button"
                aria-label={x(listening ? "micStop" : "micRewrite", { index: index + 1 })}
                aria-pressed={listening}
                onClick={() => (listening ? recognition.stop() : privacy.ask(recognition.start))}
                className={`grid size-11 shrink-0 place-items-center rounded-full border border-border-strong ${listening ? "bg-surface text-accent-strong shadow-[inset_0_0_0_2px_var(--sd-accent-strong)]" : "bg-accent text-accent-ink"}`}
              >
                <Icon name={listening ? "stop" : "mic"} className="size-5" />
              </button>
            )}
          </div>
          {tooLong && <p className="text-sm text-muted" role="status">{x("tooLong", { limit: MAX_REWRITE_CHARS })}</p>}
          {listening && <p className="text-sm text-muted" role="status" lang={language} dir="auto">{recognition.transcript}</p>}
          {recognition.status === "error" && recognition.error !== "no-speech" && <p className="text-sm text-muted" role="status">{x(recognition.error === "denied" ? "denied" : "failed")}</p>}
          {privacy.sheet}
        </>
      )}
      {(pending || outcome || error) && <p className="text-muted" role="status">{t(error ? "rewriteUnsent" : outcome ?? "rewritePending")}</p>}
    </form>
  );
}

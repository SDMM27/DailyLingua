"use client";

import { MAX_REWRITE_CHARS, type WritingFeedbackResponse } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { EventSyncApi } from "@/components/pwa/event-sync-provider";
import { Button } from "@/components/ui/button";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { useOnlineStatus } from "@/lib/offline/online-status";

const resultSchema = z.object({ accepted: z.boolean() });
type Sentence = Extract<WritingFeedbackResponse, { status: "ready" }>["sentences"][number];
type Outcome = "accepted" | "tryAgain" | "rewriteUnsent";

export function RewriteTask({ sync, productionId, sentence, index, attemptId }: {
  sync: EventSyncApi;
  productionId: string;
  sentence: Sentence;
  index: number;
  attemptId?: string;
}) {
  const t = useTranslations("writingFeedback");
  const online = useOnlineStatus();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [settled, setSettled] = useState<{ id: string; outcome: Outcome }>();
  const outcome = settled?.id === attemptId ? settled?.outcome : undefined;
  const pending = Boolean(attemptId && !outcome);

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
      if (!text.trim() || pending || submitting || outcome === "accepted") return;
      setSubmitting(true);
      setError(false);
      try {
        await sync.enqueueRewrite(productionId, index, text.trim());
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
              dir="auto" className="mt-1 min-h-24 w-full rounded-xl border border-line bg-surface p-3 text-[17px]" />
          </label>
          <Button type="submit" variant="secondary" disabled={!text.trim() || submitting}>{t("checkRewrite")}</Button>
        </>
      )}
      {(pending || outcome || error) && <p className="text-muted" role="status">{t(error ? "rewriteUnsent" : outcome ?? "rewritePending")}</p>}
    </form>
  );
}

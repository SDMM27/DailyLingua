"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ACCOUNT_HEADER } from "@/lib/offline/account";

/** "Change" link of one unfinished quest: asks the server for another one (once a day), then asks the list to load again. */
export function RerollButton({ userId, assignmentId, quest, onDone }: { userId: string; assignmentId: string; quest: string; onDone: () => void }) {
  const t = useTranslations("quests");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function reroll() {
    setFailed(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/quests/reroll", {
          method: "POST",
          headers: { [ACCOUNT_HEADER]: userId, "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId }),
        });
        if (response.ok) {
          onDone();
          return;
        }
      } catch {
        // A network failure is reported like a refusal; nothing changed.
      }
      setFailed(true);
    });
  }

  return (
    <>
      <button type="button" onClick={reroll} disabled={pending} aria-label={t("changeLabel", { quest })}
        className="inline-flex min-h-11 items-center px-1 text-accent-strong underline underline-offset-4 disabled:opacity-60">
        {t("change")}
      </button>
      {failed && <span role="status" className="sr-only">{t("failed")}</span>}
    </>
  );
}

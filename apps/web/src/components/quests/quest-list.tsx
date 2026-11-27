"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import type { QuestOverview, QuestView } from "@/lib/quests/refresh";
import { RerollButton } from "./reroll-button";

/**
 * Quests of the day or the week: a few quiet lines (wording, "1 / 2", a tick when done), no percentage and no alert colour.
 * The list is loaded when the page opens (`GET /api/quests` creates and settles the quests); nothing shows while it loads,
 * when the switch is off, or when the request fails. A "Change" link sits on one unfinished quest of the day while the reroll is free.
 */
export function QuestList({ userId, period }: { userId: string; period: "day" | "week" }) {
  const t = useTranslations("quests");
  const [overview, setOverview] = useState<QuestOverview | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/quests", { headers: { [ACCOUNT_HEADER]: userId } })
      .then((response) => (response.ok ? response.json() as Promise<{ quests: QuestOverview | null }> : null))
      .then((body) => { if (!cancelled) setOverview(body?.quests ?? null); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [userId, reload]);

  const quests: QuestView[] = overview ? overview[period] : [];
  if (quests.length === 0) return null;
  const rerollable = period === "day" && overview?.canReroll ? quests.find((quest) => !quest.done) : undefined;
  const headingId = `quests-${period}`;
  return (
    <section aria-labelledby={headingId} className="mt-8" data-testid={`quests-${period}`}>
      <h2 id={headingId} className="meta">{t(period === "day" ? "title" : "weekTitle")}</h2>
      <ul className="mt-2 divide-y divide-line">
        {quests.map((quest) => {
          const label = t(`items.${quest.questId}` as "items.read_2");
          return (
            <li key={quest.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
              <span className={quest.done ? "text-muted" : undefined}>{label}</span>
              <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
                {quest.done ? (
                  <>
                    <span aria-hidden="true" className="text-success">✓</span>
                    <span className="sr-only">{t("done")}</span>
                  </>
                ) : t("progress", { current: quest.progress, target: quest.target })}
                {rerollable?.id === quest.id && <RerollButton userId={userId} assignmentId={quest.id} quest={label} onDone={() => setReload((value) => value + 1)} />}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

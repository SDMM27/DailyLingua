"use client";

import type { LeagueSummary } from "@dailylingua/data";
import { useTranslations } from "next-intl";
import { setLeague } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { EmptyState } from "./empty-state";
import { ProgressRing } from "./progress-ring";
import { useSocialAction } from "./use-social-action";

/** The collective challenge of the week: no ranking, no name. Three states: off, registered but not eligible yet, running. */
export function LeaguePanel({ enabled, summary }: { enabled: boolean; summary: LeagueSummary }) {
  const t = useTranslations("social.league");
  const error = useTranslations("social");
  const { run, pending, failed } = useSocialAction();
  const message = failed ? <FormMessage kind="error">{error("error")}</FormMessage> : null;

  if (!enabled) {
    return (
      <EmptyState title={t("emptyTitle")} body={t("emptyBody")}>
        <Button disabled={pending} onClick={() => run(() => setLeague(true))}>{t("activate")}</Button>
        {message}
      </EmptyState>
    );
  }
  if (!summary.registered || !summary.eligible) {
    return (
      <div className="space-y-5">
        <EmptyState title={t("pendingTitle")} body={t("pendingBody")}>
          <p className="rounded-xl bg-xp-soft p-4 text-start">{t("pendingNote")}</p>
        </EmptyState>
        {message}
        <div className="text-center">
          <Button variant="ghost" className="mx-auto" disabled={pending} onClick={() => run(() => setLeague(false))}>{t("stop")}</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6 py-4 text-center">
      <ProgressRing total={summary.total} goal={summary.goal} caption={t("ringCaption", { goal: summary.goal })}
        label={t("ringLabel", { total: summary.total, goal: summary.goal })} />
      <div>
        <p>{t("participants", { count: summary.participants })} · {t("daysLeft", { days: summary.daysLeft })}</p>
        <p className="mt-1 text-sm text-muted">{t("mine", { xp: summary.mine })}</p>
      </div>
      {message}
      <Button variant="ghost" className="mx-auto" disabled={pending} onClick={() => run(() => setLeague(false))}>{t("leave")}</Button>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { GuestTrialBanner } from "@/components/auth/guest-trial-banner";
import { TrialOverCard } from "@/components/auth/trial-over-card";
import { MissionPreparing } from "@/components/mission/mission-preparing";
import { MissionView } from "@/components/mission/mission-view";
import { Card, PageHeader } from "@/components/ui/primitives";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { formatLongDate } from "@/lib/domain/dates";
import { checkBudget } from "@/lib/domain/time-budget";

export const metadata: Metadata = { title: "Mission du jour" };
// Preparing the mission (server action called from this page) can wait for the language model.
export const maxDuration = 120;

export default async function MissionPage() {
  await connection();
  const repo = await getRepository();
  await requirePreferences();
  const today = await getToday();
  const mission = await repo.getMission(today);
  const guestTrial = await repo.getGuestTrial();
  const trialBanner = guestTrial && (
    <div className="mb-6">
      <GuestTrialBanner trial={guestTrial} startedToday={mission !== null} />
    </div>
  );

  if (!mission && !repo.isDemo) {
    return (
      <>
        <PageHeader eyebrow={formatLongDate(today)} title="Mission du jour" />
        {trialBanner}
        {guestTrial && !guestTrial.canStartToday ? <TrialOverCard /> : <MissionPreparing />}
      </>
    );
  }

  if (!mission) {
    return (
      <>
        <PageHeader eyebrow={formatLongDate(today)} title="Mission du jour" />
        <Card>
          <p className="font-serif text-lg">La mission de ce matin n’est pas encore prête.</p>
          <p className="mt-2 text-sm text-ink-soft">
            En attendant, tu peux faire tes{" "}
            <Link href="/vocabulaire" className="font-medium underline underline-offset-4">
              révisions de vocabulaire
            </Link>
            .
          </p>
        </Card>
      </>
    );
  }

  const budget = checkBudget(mission);
  return (
    <>
      <PageHeader eyebrow={formatLongDate(today)} title="Mission du jour">
        {budget.plannedMinutes} minutes, {mission.sessions.length} langue{mission.sessions.length > 1 ? "s" : ""}.
        Lis ou écoute le contenu original, puis coche chaque étape terminée.
        {!budget.withinBudget && (
          <span className="mt-1 block text-danger">
            Cette mission dépasse ton budget de {budget.overByMinutes} min.
          </span>
        )}
        {mission.exerciseSource && (
          <span className="mt-1 block text-[13px] text-muted">
            {mission.exerciseSource === "ai"
              ? "Exercices rédigés par une IA à partir du titre et de l’accroche : ils peuvent contenir des erreurs."
              : "Exercices simplifiés : la rédaction par IA n’était pas disponible aujourd’hui."}
          </span>
        )}
      </PageHeader>
      {trialBanner}
      <MissionView
        mission={mission}
        progress={await repo.getMissionProgress(mission)}
        persist={!repo.isDemo}
        canReviewWriting={repo.canReviewWriting}
      />
    </>
  );
}

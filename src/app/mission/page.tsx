import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { GuestTrialBanner } from "@/components/auth/guest-trial-banner";
import { TrialOverCard } from "@/components/auth/trial-over-card";
import { NextTopicCard } from "@/components/mission/next-topic-card";
import { RestDayCard } from "@/components/mission/rest-day-card";
import { MissionPreparing } from "@/components/mission/mission-preparing";
import { MissionView } from "@/components/mission/mission-view";
import { Card, PageHeader } from "@/components/ui/primitives";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { formatLongDate } from "@/lib/domain/dates";
import { goalsForDate } from "@/lib/domain/schedule";
import { checkBudget } from "@/lib/domain/time-budget";
import type { Language } from "@/lib/schemas/common";
import type { Topic } from "@/lib/schemas/preferences";

export const metadata: Metadata = { title: "Mission du jour" };
// Preparing the mission (server action called from this page) can wait for the language model.
export const maxDuration = 120;

export default async function MissionPage() {
  await connection();
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const mission = await repo.getMission(today);
  const guestTrial = await repo.getGuestTrial();
  const requests = await repo.listMissionRequests();
  const trialBanner = guestTrial && (
    <div className="mb-6">
      <GuestTrialBanner trial={guestTrial} startedToday={mission !== null} />
    </div>
  );

  if (!mission && !repo.isDemo) {
    // A rest day has no mission to prepare (the server would answer "rest-day" anyway).
    const restDay = goalsForDate(preferences.goals, today).length === 0;
    return (
      <>
        <PageHeader eyebrow={formatLongDate(today)} title="Mission du jour" />
        {trialBanner}
        {restDay ? <RestDayCard homeLink /> : guestTrial && !guestTrial.canStartToday ? <TrialOverCard /> : <MissionPreparing />}
        {restDay && <NextTopicCard today={today} requests={requests} />}
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
  // The domains asked for today: a session whose content has none of them says so.
  const requestedTopics: Partial<Record<Language, Topic>> = {};
  for (const request of requests) if (request.date === today) requestedTopics[request.language] = request.topic;
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
        requestedTopics={requestedTopics}
      />
      <div className="mt-12">
        <NextTopicCard today={today} requests={requests} />
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MissionView } from "@/components/mission/mission-view";
import { Card, PageHeader } from "@/components/ui/primitives";
import { getRepository, getToday } from "@/lib/data/repository";
import { formatLongDate } from "@/lib/domain/dates";
import { checkBudget } from "@/lib/domain/time-budget";

export const metadata: Metadata = { title: "Mission du jour" };

export default async function MissionPage() {
  await connection();
  const today = await getToday();
  const mission = await (await getRepository()).getMission(today);

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
      </PageHeader>
      <MissionView mission={mission} />
    </>
  );
}

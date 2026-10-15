import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRightIcon } from "@/components/icons";
import { SkipPlacementButton } from "@/components/placement/skip-placement-button";
import { Card, DemoNotice, LanguageTag, PageHeader } from "@/components/ui/primitives";
import { getRepository, requirePreferences } from "@/lib/data/repository";
import { formatLongDate, toDateKey } from "@/lib/domain/dates";
import { LANGUAGE_PURPOSE_LABELS, PLACEMENT_CONFIDENCE_LABELS } from "@/lib/domain/labels";
import type { PlacementSummary } from "@/lib/schemas/placement";

export const metadata: Metadata = { title: "Test de niveau" };

export default async function LevelPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  await connection();
  const { bienvenue } = await searchParams;
  const onboarding = bienvenue === "1";
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const tests = await repo.listPlacementTests();
  const dateOf = (test: PlacementSummary) =>
    formatLongDate(toDateKey(new Date(test.takenAt), preferences.timeZone));

  return (
    <>
      <PageHeader eyebrow={onboarding ? "Dernière étape" : "Niveau"} title="Où en es-tu ?">
        {onboarding
          ? "Avant ta première mission, un test rapide pour régler le niveau de chaque langue. Tu peux aussi le passer et le faire plus tard."
          : "Un test court par langue pour estimer ton niveau. Tu peux corriger le résultat avant de l’enregistrer."}
      </PageHeader>
      {repo.isDemo && <DemoNotice>Mode démonstration : tu peux faire un test, rien n’est enregistré.</DemoNotice>}
      <ul className="space-y-4">
        {preferences.goals.map((goal) => {
          const test = tests.find((t) => t.language === goal.language);
          return (
            <li key={goal.language}>
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <LanguageTag language={goal.language} />
                  <span className="text-sm text-ink-soft">
                    Niveau actuel : <strong className="font-semibold text-ink">{goal.level}</strong>
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">{LANGUAGE_PURPOSE_LABELS[goal.purpose].title}</p>
                <p className="mt-3 text-[15px]">
                  {test?.status === "completed" ? (
                    <>
                      Testé le {dateOf(test)} : {test.estimatedLevel}, confiance{" "}
                      {PLACEMENT_CONFIDENCE_LABELS[test.confidence].title}
                      {test.chosenLevel !== test.estimatedLevel && <> (niveau retenu : {test.chosenLevel})</>}
                    </>
                  ) : test?.status === "skipped" ? (
                    <>Test passé le {dateOf(test)}</>
                  ) : (
                    "Pas encore évalué"
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/niveau/${goal.language}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper"
                  >
                    {test?.status === "completed" ? "Refaire le test" : "Faire le test"}
                    <ArrowRightIcon width={14} height={14} />
                  </Link>
                  {!test && <SkipPlacementButton language={goal.language} persist={!repo.isDemo} />}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      {onboarding && (
        <Link
          href="/"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]"
        >
          Continuer vers ma mission
          <ArrowRightIcon width={16} height={16} />
        </Link>
      )}
    </>
  );
}

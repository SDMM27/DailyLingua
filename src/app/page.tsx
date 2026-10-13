import Link from "next/link";
import { connection } from "next/server";
import { InstallBanner } from "@/components/install/install-banner";
import { MissionSummaryCard } from "@/components/dashboard/mission-summary-card";
import { ReviewPreview } from "@/components/dashboard/review-preview";
import { WeekCard } from "@/components/dashboard/week-card";
import { languageStyle } from "@/components/ui/language-style";
import { ArrowRightIcon, HistoryIcon, SlidersIcon } from "@/components/icons";
import { Card, DemoNotice, Eyebrow } from "@/components/ui/primitives";
import { getRepository, getToday } from "@/lib/data/repository";
import { addDays, diffInDays, formatLongDate } from "@/lib/domain/dates";
import { languageInfo } from "@/lib/domain/languages";
import { dueToday, upcomingReviews } from "@/lib/domain/spaced-repetition";
import { computeStreak, recentDays } from "@/lib/domain/stats";

export default async function DashboardPage() {
  await connection(); // depends on today's date
  const repo = getRepository();
  const today = await getToday();
  const [preferences, mission, history, studyDates, vocabulary] = await Promise.all([
    repo.getPreferences(),
    repo.getMission(today),
    repo.getHistory(),
    repo.getStudyDates(),
    repo.listVocabulary(),
  ]);

  const weekStart = addDays(today, -6);
  const stats = {
    streak: computeStreak(studyDates, today),
    daysStudied: new Set(studyDates).size,
    wordsKnown: vocabulary.filter((v) => v.status === "known").length,
    weekMinutes: history
      .filter((h) => diffInDays(weekStart, h.date) >= 0)
      .reduce((sum, h) => sum + h.completedMinutes, 0),
  };

  return (
    <div className="space-y-8">
      <header>
        <Eyebrow className="mb-2">{formatLongDate(today)}</Eyebrow>
        <h1 className="font-serif text-[2.1rem] leading-[1.08] font-semibold tracking-tight sm:text-5xl">
          {preferences.goals.map(({ language }) => (
            <span key={language} lang={language} className={`block ${languageStyle(language).text}`}>
              {languageInfo(language).greeting}.
            </span>
          ))}
        </h1>
      </header>

      <InstallBanner />

      {repo.isDemo && (
        <DemoNotice>
          Données de démonstration : les contenus citent de vraies sources, mais titres et exercices sont
          fictifs. Rien n’est encore enregistré.
        </DemoNotice>
      )}

      {mission ? (
        <MissionSummaryCard mission={mission} doneMinutes={0} />
      ) : (
        <Card>
          <Eyebrow>Mission du jour</Eyebrow>
          <p className="mt-2 font-serif text-lg">La mission de ce matin n’est pas encore prête.</p>
        </Card>
      )}

      <WeekCard days={recentDays(studyDates, today)} stats={stats} />

      <ReviewPreview
        items={upcomingReviews(vocabulary).slice(0, 4)}
        dueCount={dueToday(vocabulary, today).length}
        today={today}
      />

      <nav aria-label="Raccourcis" className="grid grid-cols-2 gap-3">
        {[
          { href: "/historique" as const, label: "Historique", hint: `${history.length} missions`, icon: HistoryIcon },
          { href: "/preferences" as const, label: "Préférences", hint: "Niveaux, temps, sujets", icon: SlidersIcon },
        ].map(({ href, label, hint, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 transition-colors hover:bg-surface-sunk"
          >
            <Icon className="text-ink-soft" />
            <span>
              <span className="flex items-center gap-1 font-semibold">
                {label}
                <ArrowRightIcon width={14} height={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="text-xs text-muted">{hint}</span>
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

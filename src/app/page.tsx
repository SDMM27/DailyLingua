import Link from "next/link";
import { connection } from "next/server";
import { GuestTrialBanner } from "@/components/auth/guest-trial-banner";
import { GrammarPreview } from "@/components/dashboard/grammar-preview";
import { InstallBanner } from "@/components/install/install-banner";
import { MissionSummaryCard } from "@/components/dashboard/mission-summary-card";
import { ReviewPreview } from "@/components/dashboard/review-preview";
import { WeekCard } from "@/components/dashboard/week-card";
import { languageStyle } from "@/components/ui/language-style";
import { ArrowRightIcon, HistoryIcon, PenIcon, SlidersIcon } from "@/components/icons";
import { Card, DemoNotice, Eyebrow } from "@/components/ui/primitives";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { addDays, diffInDays, formatLongDate } from "@/lib/domain/dates";
import { languageInfo } from "@/lib/domain/languages";
import { grammarLanguages } from "@/lib/grammar/courses";
import { readGrammarDraftPolicy, visibleGrammarPoints } from "@/lib/grammar/policy";
import { dueItems, dueToday, upcomingReviews } from "@/lib/domain/spaced-repetition";
import { computeStreak, recentDays } from "@/lib/domain/stats";
import { completedMinutes } from "@/lib/domain/time-budget";

export default async function DashboardPage() {
  await connection(); // depends on today's date
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const [mission, history, studyDates, vocabulary, vocabularyLists, correctionCards, grammarCards, placements, guestTrial] = await Promise.all([
    repo.getMission(today),
    repo.getHistory(),
    repo.getStudyDates(),
    repo.listVocabulary(),
    repo.listVocabularyLists(),
    repo.listCorrectionCards(),
    repo.listGrammarCards(),
    repo.listPlacementTests(),
    repo.getGuestTrial(),
  ]);
  const unassessed = !repo.isDemo && preferences.goals.some((g) => !placements.some((p) => p.language === g.language));
  const dueErrors = dueItems(correctionCards, today).length;
  // Grammar: only for languages of the user that have a visible course.
  const grammarPolicy = readGrammarDraftPolicy();
  const grammarOfUser = preferences.goals
    .map((g) => g.language)
    .filter((l) => grammarLanguages().includes(l) && visibleGrammarPoints(l, grammarPolicy).length > 0);
  const dueGrammar = dueItems(grammarCards, today).filter(
    (c) => grammarOfUser.includes(c.language) && visibleGrammarPoints(c.language, grammarPolicy).some((p) => p.id === c.pointId),
  );
  const progress = mission ? await repo.getMissionProgress(mission) : null;

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

      {guestTrial && <GuestTrialBanner trial={guestTrial} startedToday={mission !== null} />}

      {repo.isDemo && (
        <DemoNotice>
          Données de démonstration : les contenus citent de vraies sources, mais titres et exercices sont
          fictifs. Rien n’est encore enregistré.
        </DemoNotice>
      )}

      {mission ? (
        <MissionSummaryCard
          mission={mission}
          doneMinutes={completedMinutes(mission, new Set(progress?.completedActivityIds))}
        />
      ) : (
        <Card>
          <Eyebrow>Mission du jour</Eyebrow>
          <p className="mt-2 font-serif text-lg">La mission de ce matin n’est pas encore prête.</p>
          {!repo.isDemo && (
            <Link
              href="/mission"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper"
            >
              Préparer ma mission
              <ArrowRightIcon width={14} height={14} />
            </Link>
          )}
        </Card>
      )}

      {unassessed && (
        <Link
          href="/niveau"
          className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
        >
          <span className="min-w-0 flex-1">
            <Eyebrow>Niveau</Eyebrow>
            <span className="mt-1 block font-semibold">Évalue ton niveau</span>
            <span className="text-xs text-muted">Un test court par langue, pour des missions mieux ajustées.</span>
          </span>
          <ArrowRightIcon width={16} height={16} className="text-muted" />
        </Link>
      )}

      {dueErrors > 0 && (
        <Link
          href="/productions#revoir"
          className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
        >
          <span className="min-w-0 flex-1">
            <Eyebrow>Erreurs</Eyebrow>
            <span className="mt-1 block font-semibold">
              {dueErrors} erreur{dueErrors > 1 ? "s" : ""} à revoir
            </span>
            <span className="text-xs text-muted">Des passages corrigés dans tes textes, à retravailler.</span>
          </span>
          <ArrowRightIcon width={16} height={16} className="text-muted" />
        </Link>
      )}

      {grammarOfUser.length > 0 && (
        <GrammarPreview dueCount={dueGrammar.length} language={dueGrammar[0]?.language ?? grammarOfUser[0]} />
      )}

      <WeekCard days={recentDays(studyDates, today)} stats={stats} />

      <ReviewPreview
        items={upcomingReviews(vocabulary, vocabularyLists).slice(0, 4)}
        dueCount={dueToday(vocabulary, today, vocabularyLists).length}
        today={today}
      />

      <nav aria-label="Raccourcis" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { href: "/historique" as const, label: "Historique", hint: `${history.length} missions`, icon: HistoryIcon },
          { href: "/productions" as const, label: "Productions", hint: "Mes textes corrigés", icon: PenIcon },
          { href: "/preferences" as const, label: "Préférences", hint: "Niveaux, temps, sujets", icon: SlidersIcon },
        ].map(({ href, label, hint, icon: Icon }, i, all) => (
          <Link
            key={href}
            href={href}
            className={`group flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 transition-colors hover:bg-surface-sunk ${
              // An odd last tile spans the row on a phone instead of leaving a hole.
              i === all.length - 1 && all.length % 2 === 1 ? "col-span-2 sm:col-span-1" : ""
            }`}
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

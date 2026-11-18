import { Fragment, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { GuestTrialBanner } from "@/components/auth/guest-trial-banner";
import { AlphabetPreview } from "@/components/dashboard/alphabet-preview";
import { GrammarPreview } from "@/components/dashboard/grammar-preview";
import { AssessmentInviteCard } from "@/components/assessment/assessment-invite-card";
import { InstallBanner } from "@/components/install/install-banner";
import { MissionSummaryCard } from "@/components/dashboard/mission-summary-card";
import { NextTopicCard } from "@/components/mission/next-topic-card";
import { RestDayCard } from "@/components/mission/rest-day-card";
import { ReviewPreview } from "@/components/dashboard/review-preview";
import { WeekCard } from "@/components/dashboard/week-card";
import { languageStyle } from "@/components/ui/language-style";
import { ArrowRightIcon } from "@/components/icons";
import { buttonClass, Columns, DemoNotice, Eyebrow } from "@/components/ui/primitives";
import { Ticker, type TickerItem } from "@/components/ui/ticker";
import { Brief } from "@/components/dashboard/brief";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { addDays, diffInDays, formatLongDate, toDateKey } from "@/lib/domain/dates";
import { languageInfo } from "@/lib/domain/languages";
import { alphabetLanguages } from "@/lib/alphabets";
import { readAlphabetDraftPolicy, visibleAlphabet } from "@/lib/alphabets/policy";
import { readAssessmentDraftPolicy, visibleDossiers } from "@/lib/assessment/policy";
import { assessmentInvite } from "@/lib/domain/assessment";
import { isAlphabetComplete } from "@/lib/domain/alphabet";
import { LEARNING_PATHS, pathInvites, pathStage, type PathModule } from "@/lib/domain/learning-path";
import { grammarLanguages } from "@/lib/grammar/courses";
import { readGrammarDraftPolicy, visibleGrammarPoints } from "@/lib/grammar/policy";
import { dueItems, dueToday, upcomingReviews } from "@/lib/domain/spaced-repetition";
import { goalsForDate } from "@/lib/domain/schedule";
import { computeStreak, recentDays } from "@/lib/domain/stats";
import { completedMinutes } from "@/lib/domain/time-budget";

export default async function DashboardPage() {
  await connection(); // depends on today's date
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const [mission, history, studyDates, vocabulary, vocabularyLists, correctionCards, grammarCards, alphabetCards, placements, guestTrial] = await Promise.all([
    repo.getMission(today),
    repo.getHistory(),
    repo.getStudyDates(),
    repo.listVocabulary(),
    repo.listVocabularyLists(),
    repo.listCorrectionCards(),
    repo.listGrammarCards(),
    repo.listAlphabetCards(),
    repo.listPlacementTests(),
    repo.getGuestTrial(),
  ]);
  const unassessed = !repo.isDemo && preferences.goals.some((g) => !placements.some((p) => p.language === g.language));
  // Invitation to the full assessment: the first language that has a dossier to offer and a reason to. The
  // assessments are only read when some language has a dossier (and never in the demo nor for a guest).
  const assessmentPolicy = readAssessmentDraftPolicy();
  const withDossier = new Set(
    preferences.goals.filter((g) => visibleDossiers(g.language, g.level, assessmentPolicy).length > 0).map((g) => g.language),
  );
  const assessments = withDossier.size > 0 && !repo.isDemo && !guestTrial ? await repo.listAssessments() : [];
  const assessmentInviteFor = preferences.goals.flatMap((g) => {
    const lastGraded = assessments.find((a) => a.language === g.language && a.status === "graded" && a.gradedAt);
    const kind = assessmentInvite({
      hasCompletedPlacement: placements.some((p) => p.language === g.language && p.status === "completed"),
      hasVisibleDossier: withDossier.has(g.language),
      lastGradedOn: lastGraded?.gradedAt ? toDateKey(new Date(lastGraded.gradedAt), preferences.timeZone) : null,
      today,
    });
    return kind ? [{ language: g.language, kind }] : [];
  })[0];
  const dueErrors = dueItems(correctionCards, today).length;
  // Grammar: only for languages of the user that have a visible course.
  const grammarPolicy = readGrammarDraftPolicy();
  const grammarOfUser = preferences.goals
    .map((g) => g.language)
    .filter((l) => grammarLanguages().includes(l) && visibleGrammarPoints(l, grammarPolicy).length > 0);
  const dueGrammar = dueItems(grammarCards, today).filter(
    (c) => grammarOfUser.includes(c.language) && visibleGrammarPoints(c.language, grammarPolicy).some((p) => p.id === c.pointId),
  );
  // Alphabets: for each language of the user with a visible one, the groups to review, or (for
  // learners of the script) an invitation to learn to read until every group has a card.
  const alphabetPolicy = readAlphabetDraftPolicy();
  // Where the learner stands in each language (learning-path.ts): drives which cards are invited and their order.
  const goalStages = preferences.goals.map((goal) => {
    const alphabet = alphabetLanguages().includes(goal.language) ? visibleAlphabet(goal.language, alphabetPolicy) : undefined;
    const cardsOfLanguage = alphabetCards.filter((c) => c.language === goal.language);
    const learningScript = !!alphabet && !isAlphabetComplete(alphabet, cardsOfLanguage);
    return { goal, alphabet, cardsOfLanguage, stage: pathStage(goal.level, { learningScript }) };
  });
  const alphabetPreviews = goalStages.flatMap(({ goal, alphabet, cardsOfLanguage, stage }) => {
    if (!alphabet) return [];
    const due = dueItems(cardsOfLanguage, today).filter((c) => alphabet.groups.some((g) => g.id === c.groupId));
    const invite = pathInvites(stage, "alphabet");
    return due.length > 0 || invite ? [{ language: goal.language, script: alphabet.script, dueCount: due.length }] : [];
  });
  // Grammar: shown when something is due, or when a language's stage invites to it.
  const grammarInvited = goalStages.find(({ goal, stage }) => grammarOfUser.includes(goal.language) && pathInvites(stage, "grammar"));
  const grammarLanguage = dueGrammar[0]?.language ?? grammarInvited?.goal.language;
  const primaryStage = goalStages[0].stage; // the first goal is the main language
  // No language is worked today: no mission is expected (the reviews below stay daily).
  const restDay = goalsForDate(preferences.goals, today).length === 0;
  // The weekdays the learner works on; the streak skips the other ones. Current days apply to past dates too.
  const studyWeekdays = new Set(preferences.goals.flatMap((g) => g.days));
  const progress = mission ? await repo.getMissionProgress(mission) : null;

  const weekStart = addDays(today, -6);
  const stats = {
    streak: computeStreak(studyDates, today, studyWeekdays),
    daysStudied: new Set(studyDates).size,
    wordsKnown: vocabulary.filter((v) => v.status === "known").length,
    weekMinutes: history
      .filter((h) => diffInDays(weekStart, h.date) >= 0)
      .reduce((sum, h) => sum + h.completedMinutes, 0),
  };

  // The module cards, in the order of the primary language's stage (see learning-path.ts).
  const moduleCards: Record<PathModule, ReactNode> = {
    errors:
      dueErrors > 0 && (
        <Brief
          href="/productions#revoir"
          rubric="Erreurs"
          title={`${dueErrors} erreur${dueErrors > 1 ? "s" : ""} à revoir`}
          hint="Des passages corrigés dans tes textes, à retravailler."
        />
      ),
    grammar: grammarLanguage && <GrammarPreview dueCount={dueGrammar.length} language={grammarLanguage} />,
    alphabet: alphabetPreviews.map((preview) => <AlphabetPreview key={preview.language} {...preview} />),
    vocabulary: (
      <ReviewPreview
        items={upcomingReviews(vocabulary, vocabularyLists).slice(0, 4)}
        dueCount={dueToday(vocabulary, today, vocabularyLists).length}
        today={today}
      />
    ),
  };
  const orderedModules = LEARNING_PATHS[primaryStage].modules.map((name) => (
    <Fragment key={name}>{moduleCards[name]}</Fragment>
  ));

  const ROMAN = ["I", "II", "III"];
  const shortcuts = [
    { href: "/historique" as const, label: "Historique", hint: `${history.length} missions` },
    { href: "/productions" as const, label: "Productions", hint: "Mes textes corrigés" },
    { href: "/preferences" as const, label: "Préférences", hint: "Niveaux, temps, sujets" },
  ];
  const tickerItems: TickerItem[] =
    mission?.sessions.map((s) => ({ label: s.language.toUpperCase(), title: s.content.title, lang: s.language })) ?? [];

  return (
    <div className="space-y-8">
      <header className="border-b border-ink pb-6">
        <Eyebrow className="mb-3">{formatLongDate(today)}</Eyebrow>
        <h1 className="sd-display flex flex-wrap gap-x-10 text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.02]">
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

      <Ticker items={tickerItems} />

      <Columns
        main={
          <div className="space-y-8">
            {mission ? (
              <MissionSummaryCard
                mission={mission}
                doneMinutes={completedMinutes(mission, new Set(progress?.completedActivityIds))}
              />
            ) : restDay ? (
              <RestDayCard />
            ) : (
              <article className="border-t border-ink pt-4">
                <Eyebrow>Mission du jour</Eyebrow>
                <p className="mt-2 font-serif text-2xl">La mission de ce matin n’est pas encore prête.</p>
                {!repo.isDemo && (
                  <Link href="/mission" className={`${buttonClass.primary} mt-4`}>
                    Préparer ma mission
                    <ArrowRightIcon width={14} height={14} />
                  </Link>
                )}
              </article>
            )}

            {/* Streamed: the domains available per language are extra queries the page need not wait for. */}
            <Suspense fallback={null}>
              <NextTopicCard today={today} />
            </Suspense>
          </div>
        }
        aside={
          <div className="divide-y divide-line">
            {unassessed && (
              <Brief
                href="/niveau"
                rubric="Niveau"
                title="Évalue ton niveau"
                hint="Un test court par langue, pour des missions mieux ajustées."
              />
            )}

            {assessmentInviteFor && <AssessmentInviteCard {...assessmentInviteFor} today={today} />}

            {orderedModules}
          </div>
        }
      />

      <WeekCard days={recentDays(studyDates, today)} stats={stats} showStreak={preferences.showStreak} />

      <nav aria-label="Raccourcis" className="grid divide-y divide-line border-y border-ink sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {shortcuts.map(({ href, label, hint }, i) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-11 items-start gap-4 py-4 transition-colors hover:bg-surface-sunk/60 sm:px-5 sm:first:pl-0"
          >
            <span className="font-serif text-2xl leading-none font-extrabold text-accent-strong" aria-hidden="true">
              {ROMAN[i]}
            </span>
            <span>
              <span className="flex items-center gap-1 font-serif text-lg font-semibold">
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

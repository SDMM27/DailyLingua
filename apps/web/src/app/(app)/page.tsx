import type { Metadata } from "next";
import { oralSentences } from "@dailylingua/content";
import { learningDay, formatLongDate, languageDisplayName, resolveGameSettings } from "@dailylingua/core";
import { DataError, getLearningProgress, getProfile, listEnrollments, listSkillEstimates } from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { GoalRing } from "@/components/today/goal-ring";
import { OralCard } from "@/components/today/oral-card";
import { UnitCard } from "@/components/today/unit-card";
import { WarmupCard } from "@/components/today/warmup-card";
import { TodaySession } from "@/components/today/today-session";
import { QuestList } from "@/components/quests/quest-list";
import { refreshLegacyDataIfStale } from "@/lib/auth/claim-legacy";
import { dailyGoalXp } from "@/lib/goal";
import { gradedTextGenerationEnabled } from "@/lib/graded-text/server";
import { unitDraftsAllowed } from "@/lib/ingest/ingest-events";
import { ORAL_DICTATION_COUNT, ORAL_SENTENCE_COUNT } from "@/lib/oral/select-oral";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";
import { hasPath } from "@/lib/units/path";
import { nextUnitToDo } from "@/lib/units/today";
import { visibleUnitsFor } from "@/lib/units/visibility";
import { loadDueWarmups } from "@/lib/units/warmup";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("today");
  return { title: t("title") };
}

export default async function TodayPage() {
  // The date must be the visitor's today, not the one of the build.
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const client = await getRequestClient();
  let profile, enrollments;
  try {
    profile = await getSessionProfile();
    // Someone who stays signed in never goes through sign-in again: until their first write here, refresh the copy of
    // their old-app data (at most once an hour), then read the profile again. A failure never blocks the page.
    if (profile && (await refreshLegacyDataIfStale(client, profile))) profile = await getProfile(client);
    enrollments = await listEnrollments(client);
  } catch (error) {
    if (error instanceof DataError && error.code === "unauthenticated") redirect("/sign-in");
    throw error;
  }
  const enrollment = enrollments[0];
  if (!profile || !enrollment) redirect("/welcome");

  const day = learningDay(new Date(), profile.timeZone);
  const [locale, tCommon, t, tSession, progress] = await Promise.all([
    getLocale(), getTranslations("common"), getTranslations("today"), getTranslations("dailySession"), getLearningProgress(client, day),
  ]);
  const date = formatLongDate(day, locale);
  const settings = resolveGameSettings(gameSettingsSchema.safeParse(profile.gameSettings).data, enrollment.dailyMinutes);
  const streak = settings.streak.enabled ? progress.streak : null;
  // Beginners (A0 to A2) with a unit they may open get the way into the path below the session, and the warm-up of
  // yesterday's missed sentences when there is one.
  const estimates = await listSkillEstimates(client, enrollment.language).catch(() => []);
  const onPath = hasPath(estimates, visibleUnitsFor(enrollment.language));
  const [todo, warmups] = onPath
    ? await Promise.all([nextUnitToDo(user.id, enrollment.language), loadDueWarmups(user.id, enrollment.language, profile.timeZone).catch(() => [])])
    : [null, []];

  // « À voix haute » is offered when the language has sentences to say (published units, drafts only where allowed).
  const oralCount = Math.min(oralSentences(enrollment.language, { includeDrafts: unitDraftsAllowed() }).length, ORAL_SENTENCE_COUNT + ORAL_DICTATION_COUNT);

  return (
    <TodaySession
      language={enrollment.language}
      timeZone={profile.timeZone}
      languageName={languageDisplayName(enrollment.language, locale)}
      accentTolerance={settings.answerTolerance.accents}
      animateSummary={settings.celebrations === "full"}
      prepareText={gradedTextGenerationEnabled()}
      goal={settings.ring.enabled && <GoalRing current={progress.xp} target={dailyGoalXp(settings.ring.tier)} showValue={settings.xpVisible} />}
      quests={settings.quests.enabled && <QuestList userId={user.id} period="day" />}
      unitCard={(todo || warmups.length > 0) && (
        <>
          <WarmupCard warmups={warmups} language={enrollment.language} locale={locale} />
          {todo && <UnitCard unit={todo.unit} progress={todo.progress} language={enrollment.language} locale={locale} />}
        </>
      )}
      oralCard={oralCount > 0 && <OralCard language={enrollment.language} locale={locale} count={oralCount} />}
      roleplayAvailable={!user.isGuest}
      detail={streak && streak.current > 0 && (
        <details className="mt-5 rounded-xl border border-line bg-surface px-4">
          <summary className="min-h-11 cursor-pointer py-3">
            {tSession(streak.mode === "weekly" ? "streakWeeks" : "streakDays", { count: streak.current })}
          </summary>
          <div className="space-y-2 pb-4 text-sm text-muted">
            <p>{tSession("streakBest", { count: streak.best })}</p>
            <p>{tSession("streakFreezes", { count: streak.freezes })}</p>
          </div>
        </details>
      )}
    >
      <h1 className="sr-only">{t("title")}</h1>
      <header className="flex items-baseline justify-between gap-4">
        <p className="sd-display text-xl">{tCommon("appName")}</p>
        <p className="meta text-end">{date}</p>
      </header>
    </TodaySession>
  );
}

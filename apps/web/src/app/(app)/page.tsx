import type { Metadata } from "next";
import { learningDay, formatLongDate, languageDisplayName, resolveGameSettings } from "@dailylingua/core";
import { DataError, getLearningProgress, listEnrollments, listSkillEstimates } from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { GoalRing } from "@/components/today/goal-ring";
import { UnitCard } from "@/components/today/unit-card";
import { TodaySession } from "@/components/today/today-session";
import { dailyGoalXp } from "@/lib/goal";
import { gradedTextGenerationEnabled } from "@/lib/graded-text/server";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";
import { isBeginner, nextUnitToDo } from "@/lib/units/today";

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
    [profile, enrollments] = await Promise.all([getSessionProfile(), listEnrollments(client)]);
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
  // Beginners (A0/A1) with a unit they may open get the way into the path below the session.
  const estimates = await listSkillEstimates(client, enrollment.language).catch(() => []);
  const todo = isBeginner(estimates) ? await nextUnitToDo(user.id, enrollment.language) : null;

  return (
    <TodaySession
      language={enrollment.language}
      timeZone={profile.timeZone}
      languageName={languageDisplayName(enrollment.language, locale)}
      accentTolerance={settings.answerTolerance.accents}
      animateSummary={settings.celebrations === "full"}
      prepareText={gradedTextGenerationEnabled()}
      goal={settings.ring.enabled && <GoalRing current={progress.xp} target={dailyGoalXp(settings.ring.tier)} showValue={settings.xpVisible} />}
      unitCard={todo && <UnitCard unit={todo.unit} progress={todo.progress} language={enrollment.language} locale={locale} />}
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

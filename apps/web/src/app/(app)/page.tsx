import type { Metadata } from "next";
import { learningDay, formatLongDate, languageDisplayName, valueToLevel } from "@dailylingua/core";
import { DataError, listEnrollments, listSkillEstimates } from "@dailylingua/data";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { GoalRing } from "@/components/today/goal-ring";
import { Button } from "@/components/ui/button";
import { dailyGoalXp } from "@/lib/goal";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("today");
  return { title: t("title") };
}

/**
 * Today, first-day state: the header (name and date), one block with the goal ring, the language
 * learned, the starting level and one button. Sessions do not exist yet: the button is disabled and
 * says so, there is no placeholder content.
 */
export default async function TodayPage() {
  // The date must be the visitor's today, not the one of the build.
  await connection();
  if (!(await getSessionUser())) redirect("/sign-in");

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

  const estimates = await listSkillEstimates(client, enrollment.language);
  const first = estimates[0];
  const startLevel = first ? valueToLevel(first.levelValue) : null;

  const [locale, tCommon, t] = await Promise.all([getLocale(), getTranslations("common"), getTranslations("today")]);
  const date = formatLongDate(learningDay(new Date(), profile.timeZone), locale);

  return (
    <>
      <header className="flex items-baseline justify-between gap-4">
        <p className="sd-display text-xl">{tCommon("appName")}</p>
        <p className="meta text-end">{date}</p>
      </header>

      <article aria-labelledby="today-language" className="mt-10 space-y-6 rounded-card border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <GoalRing current={0} target={dailyGoalXp(enrollment.dailyMinutes)} />
          <div>
            <p className="meta">{t("goal.label")}</p>
            <p className="mt-1">{t("goal.caption")}</p>
          </div>
        </div>
        <hr className="border-line" />
        <div>
          {startLevel && <p className="meta">{t("session.startLevel", { level: startLevel })}</p>}
          <h1 id="today-language" className="sd-display mt-1 text-3xl capitalize">
            {languageDisplayName(enrollment.language, locale)}
          </h1>
          <p className="mt-2 text-muted">{t("session.duration", { count: enrollment.dailyMinutes })}</p>
        </div>
        <Button disabled>{t("session.soon")}</Button>
      </article>
    </>
  );
}

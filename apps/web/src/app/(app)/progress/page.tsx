import { addDays, immersionCloseThrough, languageDisplayName, learningDay, nextSteps, oldestEditableImmersionDay, resolveGameSettings, valueToLevel } from "@dailylingua/core";
import { getBadgeLanguageFacts, getImmersionOverview, getPracticeHours, getProgressOverview, listBadgeAwards, listImmersionClosed } from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MilestonesSection } from "@/components/progress/milestones-section";
import { QuestList } from "@/components/quests/quest-list";
import { ImmersionSection } from "@/components/progress/immersion-section";
import { getProgressLanguages } from "@/lib/progress-languages";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";
import { visibleUnitsFor } from "@/lib/units/visibility";

const skills = ["reading", "listening", "writing", "speaking"] as const;

export async function generateMetadata() {
  const t = await getTranslations("progress");
  return { title: t("title") };
}

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const [profile, { primary, pilots: languages }, params, locale, t] = await Promise.all([
    getSessionProfile(), getProgressLanguages(), searchParams, getLocale(), getTranslations("progress"),
  ]);
  if (!profile) redirect("/welcome");
  const language = languages.find((candidate) => candidate === params.lang) ?? languages[0];
  if (!language) notFound();

  const today = learningDay(new Date(), profile.timeZone);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const client = await getRequestClient();
  const game = resolveGameSettings(gameSettingsSchema.safeParse(profile.gameSettings).data);
  const [overview, immersion, closed, awards, badgeFacts, practiceHours] = await Promise.all([
    getProgressOverview(client, user.id, language, addDays(today, -6), today),
    getImmersionOverview(client, user.id, language, addDays(today, -6), today),
    listImmersionClosed(client, user.id, addDays(today, -6), immersionCloseThrough(today)),
    game.badges.enabled ? listBadgeAwards(client, user.id) : Promise.resolve([]),
    game.badges.enabled ? getBadgeLanguageFacts(client, user.id, language) : Promise.resolve(null),
    game.badges.enabled ? getPracticeHours(client, user.id) : Promise.resolve(0),
  ]);
  const passed = new Set(overview.passedUnits.map((unit) => unit.unitId));
  const units = visibleUnitsFor(language).filter((unit) => passed.has(unit.id) && unit.canDo.length > 0);
  const contentLocale = locale === "fr" ? "fr" : "en";
  const shortDate = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "UTC" });
  const longDate = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" });

  return (
    <div className="progress-page">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">{t("title")}</h1>
        {languages.length > 1 ? (
          <nav aria-label={t("languages")} className="flex flex-wrap gap-2">
            {languages.map((candidate) => (
              <Link key={candidate} href={candidate === languages[0] ? "/progress" : `/progress?lang=${candidate}`}
                aria-current={candidate === language ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold ${candidate === language ? "border-accent text-accent-strong" : "border-line text-muted"}`}>
                {languageDisplayName(candidate, locale)}
              </Link>
            ))}
          </nav>
        ) : <p className="font-semibold text-muted">{languageDisplayName(language, locale)}</p>}
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-x-10">
        <section className="rounded-xl border border-line bg-surface p-4 md:col-start-1 md:row-start-1" aria-labelledby="progress-days">
          <h2 id="progress-days" className="font-display text-2xl font-semibold">{t("studyDays")}</h2>
          <p className="mt-1 text-sm text-muted">{t("allLanguages")}</p>
          <ul className="mt-4 grid grid-cols-7 gap-1 text-center">
            {dates.map((day) => {
              const studied = overview.studyDays.includes(day);
              const date = new Date(day);
              return (
                <li key={day}>
                  <time dateTime={day} className="block text-xs text-muted" aria-label={longDate.format(date)}>
                    {shortDate.format(date)}
                  </time>
                  <span aria-hidden="true" className={studied ? "font-semibold text-success" : "text-muted"}>{studied ? "✓" : "·"}</span>
                  <span className="sr-only">{t(studied ? "studied" : "noStudy")}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <ImmersionSection userId={user.id} language={language} today={today} oldestDay={oldestEditableImmersionDay(today)}
          appMinutes={immersion.appMinutes} declaredMinutes={immersion.declaredMinutes} entries={immersion.entries}
          xpEnabled={game.immersionXp.enabled} closedXp={closed.reduce((sum, day) => sum + day.xp, 0)} />

        {game.quests.enabled && <div className="md:col-start-1 md:row-start-4"><QuestList userId={user.id} period="week" /></div>}

        {badgeFacts && (
          <div className="md:col-start-1 md:row-start-5">
            <MilestonesSection now={new Date()} steps={nextSteps(badgeFacts, practiceHours)}
              earned={awards.filter((badge) => badge.language === language || badge.language === null)} />
          </div>
        )}

        <section className="md:col-start-2 md:row-span-3 md:row-start-1" aria-labelledby="progress-skills">
          <h2 id="progress-skills" className="mb-3 font-display text-2xl font-semibold">{t("skills")}</h2>
          <table aria-labelledby="progress-skills" className="w-full border-t-2 border-accent text-start text-sm">
            <thead className="sr-only">
              <tr><th scope="col">{t("skill")}</th><th scope="col">{t("level")}</th><th scope="col">{t("origin")}</th></tr>
            </thead>
            <tbody>
              {skills.map((skill) => {
                const estimate = overview.skills.find((entry) => entry.skill === skill);
                return (
                  <tr key={skill} className="border-b border-line">
                    <th scope="row" className="py-3 pe-2 text-start font-semibold">{t(skill)}</th>
                    <td className="py-3 pe-2 font-display text-2xl text-accent-strong">
                      {estimate ? valueToLevel(estimate.levelValue) : <span aria-hidden="true">—</span>}
                    </td>
                    <td className="py-3 text-end text-muted">{t(estimate ? `source.${estimate.source}` : "unmeasured")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 md:col-start-1 md:row-start-3" aria-labelledby="progress-goals">
          <h2 id="progress-goals" className="font-display text-2xl font-semibold">{t("goals")}</h2>
          {units.length === 0 ? <p className="mt-2 text-sm text-muted">{t("noGoals")}</p> : (
            <ul className="mt-3 space-y-4">
              {units.map((unit) => (
                <li key={unit.id}>
                  {language === primary ? <Link className="font-semibold text-accent-strong underline underline-offset-2" href={`/parcours/${language}/${unit.id}`}>
                    {unit.title[contentLocale]}
                  </Link> : <p className="font-semibold">{unit.title[contentLocale]}</p>}
                  <ul className="mt-1 list-disc space-y-1 ps-5 text-sm">
                    {unit.canDo.map((goal) => <li key={goal.id}>{goal.text[contentLocale]}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

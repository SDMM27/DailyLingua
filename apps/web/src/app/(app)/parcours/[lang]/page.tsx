import type { Metadata } from "next";
import { formatShortDate, languageDisplayName, learningDay } from "@dailylingua/core";
import { DataError, getUnitProgress, listEnrollments, listSkillEstimates } from "@dailylingua/data";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PathMap } from "@/components/path/path-map";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";
import { languageStyle } from "@/lib/units/language-style";
import { buildPath, hasPath } from "@/lib/units/path";
import type { UnitProgressView } from "@/lib/units/progress";
import { visibleUnitsFor } from "@/lib/units/visibility";
import { loadDueWarmups } from "@/lib/units/warmup";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.nav");
  return { title: t("path") };
}

export default async function PathPage({ params }: PageProps<"/parcours/[lang]">) {
  // Progress and the warm-ups depend on the visitor and on the day, never on the build.
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

  const { lang } = await params;
  if (lang !== enrollment.language) notFound();
  const units = visibleUnitsFor(lang);
  const estimates = await listSkillEstimates(client, lang).catch(() => []);
  // No beginner path for this learner: the tab does not exist, the screen goes home.
  if (!hasPath(estimates, units)) redirect("/");

  const [rows, warmups, locale] = await Promise.all([
    getUnitProgress(client, user.id, lang),
    loadDueWarmups(user.id, lang, profile.timeZone).catch(() => []),
    getLocale(),
  ]);
  const progress = new Map<string, UnitProgressView>(rows.map((row) => [row.unitId, { steps: row.steps, bestScore: row.bestScore, testAttempts: row.testAttempts, passedAt: row.passedAt }]));
  const explanation = locale === "fr" ? "fr" : "en";
  const model = buildPath(units, progress, {
    locale: explanation,
    warmups: new Map(warmups.map((warmup) => [warmup.unit.id, warmup.itemIds.length])),
    passedOn: (passedAt) => formatShortDate(learningDay(new Date(passedAt), profile.timeZone), locale),
  });

  return (
    <div style={languageStyle(lang)}>
      <PathMap language={lang} languageName={languageDisplayName(lang, locale)} locale={explanation} model={model} />
    </div>
  );
}

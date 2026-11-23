import type { Metadata } from "next";
import { resolveGameSettings } from "@dailylingua/core";
import { DataError, getUnitXp, listEnrollments } from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { UnitExtrasProvider } from "@/components/unit/unit-extras";
import { UnitPlayer } from "@/components/unit/unit-player";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";
import { loadUnitProgress } from "@/lib/units/progress";
import { visibleUnit, visibleUnitsFor } from "@/lib/units/visibility";
import { loadDueWarmups } from "@/lib/units/warmup";

export async function generateMetadata({ params }: PageProps<"/parcours/[lang]/[unit]">): Promise<Metadata> {
  const unit = visibleUnit((await params).unit);
  const locale = (await getLocale()) === "fr" ? "fr" : "en";
  return { title: unit?.title[locale] };
}

export default async function UnitPage({ params, searchParams }: PageProps<"/parcours/[lang]/[unit]">) {
  // Progress and the guard depend on the visitor and on the environment, never on the build.
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

  const { lang, unit: unitId } = await params;
  const unit = visibleUnit(unitId);
  // The unit of the language the learner studies, published (or drafts allowed with UNIT_DRAFTS=show).
  if (!unit || unit.language !== lang || lang !== enrollment.language) notFound();

  const startAtTest = (await searchParams).start === "test";
  const [progress, locale, unitXp, warmups] = await Promise.all([
    loadUnitProgress(user.id, unit.id),
    getLocale(),
    getUnitXp(client, user.id, unit.id).catch(() => 0),
    loadDueWarmups(user.id, lang, profile.timeZone).catch(() => []),
  ]);
  const settings = resolveGameSettings(gameSettingsSchema.safeParse(profile.gameSettings).data, enrollment.dailyMinutes);
  const explanation = locale === "fr" ? "fr" : "en";
  const next = visibleUnitsFor(lang).find((candidate) => candidate.order > unit.order);

  const extras = { pathHref: `/parcours/${lang}`, startAtTest, unitXp, warmupItemIds: warmups.find((warmup) => warmup.unit.id === unit.id)?.itemIds ?? [] };

  return (
    <UnitExtrasProvider value={extras}>
      <UnitPlayer
        unit={unit}
        progress={progress}
        tolerance={settings.answerTolerance.accents}
        xpVisible={settings.xpVisible}
        animate={settings.celebrations === "full"}
        nextUnit={next ? { id: next.id, title: next.title[explanation] } : null}
        backHref="/"
      />
    </UnitExtrasProvider>
  );
}

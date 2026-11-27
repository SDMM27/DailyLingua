import type { Metadata } from "next";
import { placementBankOf } from "@dailylingua/content/placement";
import { languageDisplayName, valueToLevel } from "@dailylingua/core";
import { DataError, listEnrollments, listSkillEstimates } from "@dailylingua/data";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PlacementFlow } from "@/components/placement/placement-flow";
import { placementDoneHref } from "@/lib/placement/done-href";
import { testStartLevel } from "@/lib/placement/progress";
import { getRequestClient, getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("placement.intro");
  return { title: t("title") };
}

/**
 * The placement test of a language the learner studies, for the languages that have a bank. The questions are sent to
 * the page with their answers (the engine runs in the browser, as in the first app); the server replays the answers when
 * the result is saved and never trusts the estimate the browser computed.
 */
export default async function PlacementPage({ params }: PageProps<"/placement/[lang]">) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const { lang } = await params;
  const bank = placementBankOf(lang);
  if (!bank) notFound();
  let enrollments;
  try {
    enrollments = await listEnrollments(await getRequestClient());
  } catch (error) {
    if (error instanceof DataError && error.code === "unauthenticated") redirect("/sign-in");
    throw error;
  }
  if (enrollments.length === 0) redirect("/welcome");
  if (!enrollments.some((enrollment) => enrollment.language === lang)) notFound();

  // The level declared at the installation (a reading estimate), or the one of the last test: the test starts there.
  const [locale, estimates] = await Promise.all([getLocale(), listSkillEstimates(await getRequestClient(), lang).catch(() => [])]);
  const reading = estimates.find((estimate) => estimate.skill === "reading");
  return (
    <PlacementFlow
      userId={user.id}
      language={lang}
      languageName={languageDisplayName(lang, locale)}
      startLevel={testStartLevel(reading ? valueToLevel(reading.levelValue) : null)}
      items={bank.items}
      doneHref={placementDoneHref(lang, enrollments)}
    />
  );
}

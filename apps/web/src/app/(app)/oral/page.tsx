import type { Metadata } from "next";
import { languageDisplayName, resolveGameSettings } from "@dailylingua/core";
import { DataError, listEnrollments } from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { OralWorkshopPlayer } from "@/components/oral/oral-workshop-player";
import { RoleplayCard } from "@/components/roleplay/roleplay-card";
import { explanationLanguageOf } from "@/lib/ingest/build-state";
import { buildOralPacket } from "@/lib/oral/build-oral-packet";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";
import { visibleUnit } from "@/lib/units/visibility";

/** Units named on the entry screen: the first ones the sentences come from. */
const MAX_UNIT_TITLES = 3;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("oral.card");
  return { title: t("title") };
}

/** « À voix haute »: the sentences of the learner's units to say, repeat and write (`j5-pr1-atelier-oral.md` §7). */
export default async function OralPage() {
  // The choice of sentences depends on the learner's attempts and on the day, never on the build.
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

  // A language without a sentence has no workshop.
  const packet = await buildOralPacket(user.id, enrollment.language);
  if (!packet) notFound();

  const locale = explanationLanguageOf(profile.nativeLanguage);
  const settings = resolveGameSettings(gameSettingsSchema.safeParse(profile.gameSettings).data, enrollment.dailyMinutes);
  const unitIds = [...new Set([...packet.sentences, ...packet.dictation].map((sentence) => sentence.id.split("#")[0]!))];
  const units = unitIds.flatMap((id) => visibleUnit(id)?.title[locale] ?? []).slice(0, MAX_UNIT_TITLES);

  return (
    <OralWorkshopPlayer
      packet={packet}
      languageName={languageDisplayName(enrollment.language, await getLocale())}
      units={units}
      locale={locale}
      tolerance={settings.answerTolerance.accents}
      xpVisible={settings.xpVisible}
      backHref="/"
      roleplayCard={!user.isGuest && <RoleplayCard />}
    />
  );
}

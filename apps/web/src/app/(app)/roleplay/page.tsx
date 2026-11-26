import type { Metadata } from "next";
import { resolveGameSettings } from "@dailylingua/core";
import { listEnrollments } from "@dailylingua/data";
import { resolveUiLocale } from "@dailylingua/i18n";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RoleplayPlayer } from "@/components/roleplay/roleplay-player";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("roleplay");
  return { title: t("title") };
}

export default async function RoleplayPage({ searchParams }: PageProps<"/roleplay">) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const client = await getRequestClient();
  const [profile, enrollments, locale, query] = await Promise.all([
    getSessionProfile(), listEnrollments(client), getLocale(), searchParams,
  ]);
  const enrollment = enrollments[0];
  if (!profile || !enrollment) redirect("/welcome");
  const settings = resolveGameSettings(gameSettingsSchema.safeParse(profile.gameSettings).data, enrollment.dailyMinutes);

  return (
    <RoleplayPlayer
      userId={user.id}
      language={enrollment.language}
      locale={resolveUiLocale(locale)}
      xpVisible={settings.xpVisible}
      backHref={query.from === "oral" ? "/oral" : "/"}
    />
  );
}

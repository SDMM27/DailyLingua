import type { Metadata } from "next";
import { LANGUAGE_CODES, languageDisplayName, resolveGameSettings } from "@dailylingua/core";
import { getCoopOverview, getLeagueSummary, getSocialPseudonym, listFriends } from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SocialScreen, SOCIAL_TABS, type SocialTab } from "@/components/social/social-screen";
import { getRequestClient, getSessionProfile, getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("social");
  return { title: t("title") };
}

export default async function SocialPage({ searchParams }: PageProps<"/social">) {
  // The week and the days left depend on today.
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const [profile, client, params, locale] = await Promise.all([getSessionProfile(), getRequestClient(), searchParams, getLocale()]);
  if (!profile) redirect("/welcome");

  const settings = resolveGameSettings(gameSettingsSchema.safeParse(profile.gameSettings).data);
  const pseudonym = await getSocialPseudonym(client, user.id);
  const [league, friends, coop] = pseudonym
    ? await Promise.all([getLeagueSummary(client), listFriends(client), getCoopOverview(client)])
    : [{ registered: false, eligible: false, mode: "collective" as const, participants: 0, total: 0, goal: 0, mine: 0, daysLeft: 0 }, [], { enabled: false, invitations: [], challenge: null }];
  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab: SocialTab = SOCIAL_TABS.find((tab) => tab === requested) ?? "league";
  const languageNames = Object.fromEntries(LANGUAGE_CODES.map((code) => [code, languageDisplayName(code, locale)]));

  return (
    <SocialScreen pseudonym={pseudonym} leagueEnabled={settings.league.enabled} friendsEnabled={settings.friends.enabled} league={league}
      friends={friends} coop={coop} languageNames={languageNames} initialTab={initialTab} />
  );
}

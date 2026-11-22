import type { Metadata } from "next";
import { resolveGameSettings } from "@dailylingua/core";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InterfaceLanguage } from "@/components/settings/interface-language";
import { GamePreferences } from "@/components/settings/game-preferences";
import { LearningSettings } from "@/components/settings/learning-settings";
import { SignOutForm } from "@/components/settings/sign-out-form";
import { ThemeChoice } from "@/components/settings/theme-choice";
import { Button } from "@/components/ui/button";
import { nativeLanguageOptions, timeZoneOptions } from "@/lib/languages";
import { getSessionProfile, getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const profile = await getSessionProfile();
  if (!profile) redirect("/welcome");

  const [locale, t, ta] = await Promise.all([getLocale(), getTranslations("settings"), getTranslations("auth.signOut")]);
  const game = resolveGameSettings(gameSettingsSchema.safeParse(profile.gameSettings).data);

  return (
    <>
      <h1 className="sd-display text-3xl">{t("title")}</h1>

      <div className="mt-8 space-y-10">
        <section aria-labelledby="settings-display" className="space-y-5">
          <h2 id="settings-display" className="meta">
            {t("groups.display")}
          </h2>
          <InterfaceLanguage />
          <ThemeChoice />
        </section>

        <section aria-labelledby="settings-learning" className="space-y-5">
          <h2 id="settings-learning" className="meta">
            {t("groups.learning")}
          </h2>
          <LearningSettings
            nativeOptions={nativeLanguageOptions(locale)}
            timeZones={timeZoneOptions()}
            initial={{ nativeLanguage: profile.nativeLanguage, timeZone: profile.timeZone, reminderTime: profile.reminderTime }}
          />
        </section>

        <section aria-labelledby="settings-game" className="space-y-5">
          <h2 id="settings-game" className="meta">{t("game.title")}</h2>
          <GamePreferences xpVisible={game.xpVisible} streakEnabled={game.streak.enabled} celebrations={game.celebrations === "full"} />
        </section>

        <section aria-labelledby="settings-account" className="space-y-3">
          <h2 id="settings-account" className="meta">
            {t("groups.account")}
          </h2>
          <p className="text-sm text-muted">
            {user.email ? t("account.signedInAs", { email: user.email }) : t("account.guest")}
          </p>
          <SignOutForm userId={user.id} className="space-y-2">
            <Button type="submit" variant="secondary">
              {ta("action")}
            </Button>
            <p className="text-sm text-muted">{ta("confirm")}</p>
          </SignOutForm>
        </section>

        <p>
          <Link href="/lab" className="inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4">
            {t("lab.link")}
          </Link>
        </p>
      </div>
    </>
  );
}

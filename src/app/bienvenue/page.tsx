import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { getRepository } from "@/lib/data/repository";
import { ONBOARDING_DEFAULTS } from "@/lib/domain/default-preferences";

export const metadata: Metadata = { title: "Bienvenue" };

/** First run: a new account has no language yet, the user chooses theirs here. */
export default async function WelcomePage() {
  const repo = await getRepository();
  if (await repo.getPreferences()) redirect("/");
  const languages = await repo.listAvailableLanguages();

  return (
    <AuthLayout
      wide
      eyebrow="Bienvenue"
      title="Quelles langues veux-tu travailler ?"
      form={<PreferencesForm initial={ONBOARDING_DEFAULTS} languages={languages} mode="onboarding" persist />}
    >
      Choisis une à quatre langues, ton niveau et le temps dont tu disposes chaque jour. Tu pourras tout modifier
      plus tard dans les réglages.
    </AuthLayout>
  );
}

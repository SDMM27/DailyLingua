import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { PageHeader } from "@/components/ui/primitives";
import { getRepository } from "@/lib/data/repository";
import { ONBOARDING_DEFAULTS } from "@/lib/domain/default-preferences";

export const metadata: Metadata = { title: "Bienvenue" };

/** First run: a new account has no language yet, the user chooses theirs here. */
export default async function WelcomePage() {
  const repo = await getRepository();
  if (await repo.getPreferences()) redirect("/");

  return (
    <>
      <PageHeader eyebrow="Bienvenue" title="Quelles langues veux-tu travailler ?">
        Choisis une à quatre langues, ton niveau et le temps dont tu disposes chaque jour. Tu pourras tout
        modifier plus tard dans les réglages.
      </PageHeader>
      <PreferencesForm initial={ONBOARDING_DEFAULTS} mode="onboarding" persist />
    </>
  );
}

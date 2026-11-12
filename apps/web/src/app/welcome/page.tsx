import { DataError, listEnrollments } from "@dailylingua/data";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { defaultNativeLanguage, nativeLanguageOptions, targetLanguageOptions } from "@/lib/languages";
import { getRequestClient, getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.native");
  return { title: t("title") };
}

export default async function WelcomePage() {
  if (!(await getSessionUser())) redirect("/sign-in");

  // Already installed: the installation is not offered twice.
  try {
    if ((await listEnrollments(await getRequestClient())).length > 0) redirect("/");
  } catch (error) {
    if (error instanceof DataError && error.code === "unauthenticated") redirect("/sign-in");
    throw error;
  }

  const [locale, headerStore] = await Promise.all([getLocale(), headers()]);
  return (
    <OnboardingWizard
      nativeOptions={nativeLanguageOptions(locale)}
      targetOptions={targetLanguageOptions(locale)}
      defaultNative={defaultNativeLanguage(headerStore.get("accept-language"), locale)}
    />
  );
}

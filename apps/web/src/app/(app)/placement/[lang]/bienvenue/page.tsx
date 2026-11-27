import type { Metadata } from "next";
import { isPlacementLanguage } from "@dailylingua/content/placement";
import { languageDisplayName } from "@dailylingua/core";
import { DataError, listEnrollments } from "@dailylingua/data";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlacementShell } from "@/components/placement/placement-shell";
import { buttonClass } from "@/components/ui/button";
import { getRequestClient, getSessionUser } from "@/lib/session";
import { languageStyle } from "@/lib/units/language-style";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("placement.welcome");
  return { title: t("title") };
}

/** Right after the installation, for a language with a placement test: measure the level now, or start with a lesson. */
export default async function PlacementWelcomePage({ params }: PageProps<"/placement/[lang]/bienvenue">) {
  if (!(await getSessionUser())) redirect("/sign-in");
  const { lang } = await params;
  if (!isPlacementLanguage(lang)) notFound();
  let enrollments;
  try {
    enrollments = await listEnrollments(await getRequestClient());
  } catch (error) {
    if (error instanceof DataError && error.code === "unauthenticated") redirect("/sign-in");
    throw error;
  }
  if (!enrollments.some((enrollment) => enrollment.language === lang)) notFound();

  const [locale, t] = await Promise.all([getLocale(), getTranslations("placement")]);
  return (
    <PlacementShell
      style={languageStyle(lang)}
      centered
      footer={(
        <div className="mx-auto flex max-w-[520px] flex-col gap-1">
          <Link href={`/placement/${lang}`} className={`${buttonClass("primary")} min-h-14 rounded-full bg-ink text-bg`}>{t("start")}</Link>
          <Link href="/" className={`${buttonClass("ghost")} min-h-12 text-muted`}>{t("welcome.later")}</Link>
        </div>
      )}
    >
      <div className="mx-auto w-full max-w-[520px] rounded-3xl bg-lang-soft p-6">
        <p className="meta text-lang">{t("welcome.eyebrow")}</p>
        <h1 className="mt-2 mb-3 font-display text-[32px] leading-tight font-medium">{t("welcome.title")}</h1>
        <p>{t("welcome.body", { language: languageDisplayName(lang, locale) })}</p>
      </div>
    </PlacementShell>
  );
}

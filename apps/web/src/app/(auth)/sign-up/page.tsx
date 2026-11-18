import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSessionUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("title") };
}

export default async function SignUpPage() {
  if (await getSessionUser()) redirect("/");
  const t = await getTranslations("auth.signUp");

  return (
    <>
      <h1 className="sd-display text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>
      <SignUpForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined} />
    </>
  );
}

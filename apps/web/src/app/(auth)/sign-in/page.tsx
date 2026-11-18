import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { getSessionUser } from "@/lib/session";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  // The proxy only reads the JWT; the page validates the user (an account may be gone) before leaving.
  if (await getSessionUser()) redirect("/");
  const { link } = await searchParams;
  const t = await getTranslations("auth.signIn");
  const env = getSupabaseEnv();

  return (
    <>
      <h1 className="sd-display text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>
      <SignInPanel
        supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL}
        supabaseKey={env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
        linkNotice={link === "invalid" || link === "confirmed" ? link : undefined}
      />
    </>
  );
}

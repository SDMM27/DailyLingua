import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connexion" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  // Without Supabase the app is the public demo: there is nothing to sign in to.
  if (!getSupabaseEnv()) redirect("/");
  const { lien } = await searchParams;

  // Already signed in (validated with Supabase Auth, not just the cookie): nothing to do here.
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (data.user) redirect("/");

  return (
    <AuthLayout
      eyebrow="Daily Lingua"
      title="Une mission de langues chaque matin"
      form={
        <>
          <AuthForm
            turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined}
            initialError={
              lien === "invalide"
                ? "Ce lien de confirmation n’est plus valide. Connecte-toi ou recrée un compte."
                : undefined
            }
            initialNotice={lien === "confirme" ? "Adresse confirmée. Connecte-toi." : undefined}
          />
          <p className="mt-5 text-center text-sm">
            <Link href="/decouvrir" className="text-accent-strong underline underline-offset-4">
              Essayer sans compte
            </Link>
          </p>
        </>
      }
    >
      Connecte-toi pour retrouver tes mots, ta progression et la mission du jour.
    </AuthLayout>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { PageHeader } from "@/components/ui/primitives";
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
    <div className="mx-auto max-w-md pt-6">
      <PageHeader eyebrow="Daily Lingua" title="Une mission de langues chaque matin">
        Connecte-toi pour retrouver tes mots, ta progression et la mission du jour.
      </PageHeader>
      <AuthForm initialError={lien === "invalide" ? "Ce lien de confirmation n’est plus valide. Connecte-toi ou recrée un compte." : undefined} />
    </div>
  );
}

import type { Metadata } from "next";
import { RequestResetForm } from "@/components/auth/password-reset-forms";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  const { lien } = await searchParams;
  return (
    <div className="mx-auto max-w-md pt-6">
      <PageHeader eyebrow="Daily Lingua" title="Mot de passe oublié">
        Indique ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe.
      </PageHeader>
      <RequestResetForm
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined}
        initialError={lien === "invalide" ? "Ce lien a expiré ou a déjà servi. Demande-en un nouveau." : undefined}
      />
    </div>
  );
}

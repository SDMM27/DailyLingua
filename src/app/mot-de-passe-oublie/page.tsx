import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { RequestResetForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  const { lien } = await searchParams;
  return (
    <AuthLayout
      eyebrow="Daily Lingua"
      title="Mot de passe oublié"
      form={
        <RequestResetForm
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined}
          initialError={lien === "invalide" ? "Ce lien a expiré ou a déjà servi. Demande-en un nouveau." : undefined}
        />
      }
    >
      Indique ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe.
    </AuthLayout>
  );
}

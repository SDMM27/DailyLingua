import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { NewPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

// Protected by the proxy: the session comes from the link in the reset e-mail (/auth/confirm).
export default function NewPasswordPage() {
  return (
    <AuthLayout eyebrow="Daily Lingua" title="Nouveau mot de passe" form={<NewPasswordForm />}>
      Choisis un mot de passe d’au moins 8 caractères.
    </AuthLayout>
  );
}

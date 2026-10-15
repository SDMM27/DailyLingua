import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/auth/password-reset-forms";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

// Protected by the proxy: the session comes from the link in the reset e-mail (/auth/confirm).
export default function NewPasswordPage() {
  return (
    <div className="mx-auto max-w-md pt-6">
      <PageHeader eyebrow="Daily Lingua" title="Nouveau mot de passe">
        Choisis un mot de passe d’au moins 8 caractères.
      </PageHeader>
      <NewPasswordForm />
    </div>
  );
}

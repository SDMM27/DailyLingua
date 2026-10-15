"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthFormState,
  type UpdatePasswordState,
} from "@/app/actions/auth";
import { Card } from "@/components/ui/primitives";
import { MIN_PASSWORD_LENGTH } from "@/lib/schemas/auth";
import { EmailField, Feedback, PasswordField, SubmitButton } from "./auth-fields";

const linkClass = "font-semibold text-ink underline underline-offset-4";

/** Asks for the e-mail address that receives the reset link. */
export function RequestResetForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {
    error: initialError,
  });
  return (
    <Card>
      <form action={action} className="space-y-3" noValidate>
        <EmailField defaultValue={state.email} />
        <Feedback state={state} />
        <SubmitButton pending={pending} label="Envoyer le lien" />
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        <Link href="/connexion" className={linkClass}>
          Retour à la connexion
        </Link>
      </p>
    </Card>
  );
}

/** Chooses the new password once the reset link has opened a session. */
export function NewPasswordForm() {
  const [state, action, pending] = useActionState<UpdatePasswordState, FormData>(updatePassword, {});

  if (state.done) {
    return (
      <Card>
        <p role="status" className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
          Mot de passe modifié. Tu es connecté.
        </p>
        <Link
          href="/"
          className="mt-4 block w-full rounded-2xl bg-ink px-5 py-3.5 text-center text-[15px] font-semibold text-paper"
        >
          Continuer
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <form action={action} className="space-y-3" noValidate>
        <PasswordField
          label="Nouveau mot de passe"
          autoComplete="new-password"
          hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
          minLength={MIN_PASSWORD_LENGTH}
        />
        <PasswordField
          name="confirmation"
          label="Confirme le mot de passe"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
        />
        <Feedback state={state} />
        {state.expired && (
          <p className="text-center text-sm">
            <Link href="/mot-de-passe-oublie" className={linkClass}>
              Demander un nouveau lien
            </Link>
          </p>
        )}
        <SubmitButton pending={pending} label="Changer le mot de passe" />
      </form>
    </Card>
  );
}

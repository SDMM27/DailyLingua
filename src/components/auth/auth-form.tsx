"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthFormState } from "@/app/actions/auth";
import { Card } from "@/components/ui/primitives";
import { MIN_PASSWORD_LENGTH } from "@/lib/schemas/auth";
import { EmailField, Feedback, PasswordField, SubmitButton } from "./auth-fields";

type Mode = "signin" | "signup";

/** Sign-in and account creation with e-mail and password. */
export function AuthForm({ initialError, initialNotice }: { initialError?: string; initialNotice?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  return (
    <Card>
      {mode === "signin" ? <SignInForm initialError={initialError} initialNotice={initialNotice} /> : <SignUpForm />}
      <p className="mt-5 text-center text-sm text-ink-soft">
        {mode === "signin" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-semibold text-ink underline underline-offset-4"
        >
          {mode === "signin" ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </Card>
  );
}

function SignInForm({ initialError, initialNotice }: { initialError?: string; initialNotice?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {
    error: initialError,
    notice: initialNotice,
  });
  return (
    <>
      <form action={action} className="space-y-3" noValidate>
        <EmailField defaultValue={state.email} />
        <PasswordField autoComplete="current-password" />
        <Feedback state={state} />
        <SubmitButton pending={pending} label="Se connecter" />
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="text-ink-soft underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
      </p>
    </>
  );
}

function SignUpForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <EmailField defaultValue={state.email} />
      <PasswordField
        autoComplete="new-password"
        hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
        minLength={MIN_PASSWORD_LENGTH}
      />
      <Feedback state={state} />
      <SubmitButton pending={pending} label="Créer mon compte" />
      <p className="text-center text-xs text-muted">
        En créant un compte, tu acceptes la{" "}
        <Link href="/confidentialite" className="underline underline-offset-4">
          politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}

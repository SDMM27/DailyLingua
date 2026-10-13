"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthFormState } from "@/app/actions/auth";
import { Card } from "@/components/ui/primitives";
import { MIN_PASSWORD_LENGTH } from "@/lib/schemas/auth";

type Mode = "signin" | "signup";

// text-base: inputs under 16px make iOS Safari zoom in on focus.
const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base placeholder:text-muted focus:border-ink-soft focus:outline-none";

/** Sign-in and account creation with e-mail and password. */
export function AuthForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  return (
    <Card>
      {mode === "signin" ? <SignInForm initialError={initialError} /> : <SignUpForm />}
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

function SignInForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, { error: initialError });
  return (
    <form action={action} className="space-y-3" noValidate>
      <EmailField defaultValue={state.email} />
      <PasswordField autoComplete="current-password" />
      <Feedback state={state} />
      <SubmitButton pending={pending} label="Se connecter" />
    </form>
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
    </form>
  );
}

function EmailField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">Adresse e-mail</span>
      <input
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={defaultValue}
        className={inputClass}
      />
    </label>
  );
}

function PasswordField({
  autoComplete,
  hint,
  minLength,
}: {
  autoComplete: "current-password" | "new-password";
  hint?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">Mot de passe</span>
      <input
        name="password"
        type="password"
        autoComplete={autoComplete}
        required
        minLength={minLength}
        className={inputClass}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Feedback({ state }: { state: AuthFormState }) {
  return (
    <div aria-live="polite">
      {state.error && (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.notice && <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">{state.notice}</p>}
    </div>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Un instant…" : label}
    </button>
  );
}

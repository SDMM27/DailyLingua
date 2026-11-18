"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { signUp, type AuthFormState } from "@/app/actions/auth";
import { Button, buttonClass } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/schemas";
import { TurnstileWidget } from "./turnstile-widget";

export function SignUpForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const waitingForCaptcha = Boolean(turnstileSiteKey) && !captchaToken;
  const emailError = state.error === "emailRequired" || state.error === "emailInvalid" ? state.error : undefined;
  const passwordError = state.error === "passwordTooShort" || state.error === "passwordWeak" ? state.error : undefined;
  const formError = emailError || passwordError ? undefined : state.error;

  return (
    <div className="space-y-8">
      <form action={formAction} noValidate className="space-y-5">
        <TextField
          label={t("signIn.email")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          // React resets a form after its action: a new key re-applies the e-mail the visitor typed.
          key={state.email ?? ""}
          defaultValue={state.email}
          error={emailError ? te(emailError) : undefined}
          required
        />
        <TextField
          label={t("signIn.password")}
          name="password"
          type="password"
          autoComplete="new-password"
          hint={t("signUp.passwordHint", { min: PASSWORD_MIN_LENGTH })}
          error={passwordError ? te(passwordError, { min: PASSWORD_MIN_LENGTH }) : undefined}
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
        {turnstileSiteKey && (
          <TurnstileWidget siteKey={turnstileSiteKey} onToken={setCaptchaToken} fieldName="captchaToken" resetKey={state} />
        )}
        {state.notice === "checkEmail" && (
          <FormMessage kind="notice">{t("signUp.checkEmail", { email: state.email ?? "" })}</FormMessage>
        )}
        {formError && <FormMessage kind="error">{te(formError)}</FormMessage>}
        <Button type="submit" disabled={pending || waitingForCaptcha}>
          {pending ? tc("loading") : t("signUp.submit")}
        </Button>
      </form>

      <div className="space-y-2 text-center">
        <p className="text-sm text-muted">{t("signUp.hasAccount")}</p>
        <Link href="/sign-in" className={buttonClass("secondary")}>
          {t("signUp.signInLink")}
        </Link>
      </div>
    </div>
  );
}

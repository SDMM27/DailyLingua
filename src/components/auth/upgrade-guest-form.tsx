"use client";

import { useActionState } from "react";
import { upgradeGuestAccount, type AuthFormState } from "@/app/actions/auth";
import { Card } from "@/components/ui/primitives";
import { EmailField, Feedback, SubmitButton } from "./auth-fields";

/** Gives the guest an e-mail address; the link they receive lets them choose a password. */
export function UpgradeGuestForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(upgradeGuestAccount, {});
  return (
    <Card>
      <form action={action} className="space-y-3" noValidate>
        <EmailField defaultValue={state.email} />
        <Feedback state={state} />
        <SubmitButton pending={pending} label="Recevoir le lien de confirmation" />
      </form>
    </Card>
  );
}

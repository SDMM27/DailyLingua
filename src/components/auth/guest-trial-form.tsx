"use client";

import { useActionState } from "react";
import { startGuestTrial, type AuthFormState } from "@/app/actions/auth";
import { Feedback, SubmitButton } from "./auth-fields";

/** « Essayer sans compte »: opens an anonymous session, then the first-run screen. */
export function GuestTrialForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(startGuestTrial, {});
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <SubmitButton pending={pending} label="Essayer sans compte" />
    </form>
  );
}

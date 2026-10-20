"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  requestPasswordResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
  upgradeGuestSchema,
} from "@/lib/schemas/auth";
import { deleteUserAccount } from "@/lib/supabase/delete-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; notice?: string; email?: string };

/** What a guest types to confirm the deletion of their trial account (they have no e-mail). */
const GUEST_DELETE_WORD = "supprimer";

const UNAVAILABLE = "La connexion n’est pas disponible pour le moment.";
const CAPTCHA_FAILED = "La vérification anti-robot a échoué. Réessaie.";

/** Longest Turnstile token accepted from a form (they are about 1 000 characters). */
const MAX_CAPTCHA_TOKEN_LENGTH = 2048;

/** The Turnstile token posted by the form, if any (empty or oversized values are ignored). */
function captchaTokenOf(formData: FormData): string | undefined {
  const value = formData.get("captchaToken");
  if (typeof value !== "string" || value === "" || value.length > MAX_CAPTCHA_TOKEN_LENGTH) return undefined;
  return value;
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { email, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { email, error: UNAVAILABLE };

  const captchaToken = captchaTokenOf(formData);
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    ...(captchaToken && { options: { captchaToken } }),
  });
  if (error) {
    if (error.code === "captcha_failed") return { email, error: CAPTCHA_FAILED };
    // A network or server failure is not a wrong password: do not blame the credentials.
    const rejected = error.status !== undefined && error.status >= 400 && error.status < 500;
    return { email, error: rejected ? "E-mail ou mot de passe incorrect." : UNAVAILABLE };
  }
  redirect("/");
}

export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = signUpSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { email, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { email, error: UNAVAILABLE };

  const origin = await requestOrigin();
  const captchaToken = captchaTokenOf(formData);
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm`, ...(captchaToken && { captchaToken }) },
  });
  if (error) {
    if (error.code === "captcha_failed") return { email, error: CAPTCHA_FAILED };
    return { email, error: error.status === 422 ? error.message : "Impossible de créer le compte pour le moment." };
  }
  // With e-mail confirmation on there is no session yet: the link in the e-mail finishes the job.
  if (!data.session) {
    return { email, notice: "Compte créé. Ouvre le lien reçu par e-mail pour confirmer ton adresse." };
  }
  redirect("/");
}

const RESET_NOTICE =
  "Si un compte existe pour cette adresse, un e-mail vient d’être envoyé avec un lien pour choisir un nouveau mot de passe. Pense à regarder dans les spams.";

/**
 * Sends the password reset e-mail. The answer is the same whether the account exists or not
 * (and even if Supabase fails: the error is only logged), so the form cannot be used to find out
 * who has an account. Only a rate limit and a failed
 * CAPTCHA are reported, since they do not depend on the address.
 */
export async function requestPasswordReset(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = requestPasswordResetSchema.safeParse({ email });
  if (!parsed.success) return { email, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { email, error: "La réinitialisation du mot de passe n’est pas disponible dans la démo." };

  const origin = await requestOrigin();
  const captchaToken = captchaTokenOf(formData);
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/nouveau-mot-de-passe`,
    ...(captchaToken && { captchaToken }),
  });
  if (error) {
    // Says nothing about the account, so it is safe to report.
    if (error.code === "captcha_failed") return { email, error: CAPTCHA_FAILED };
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return { email, error: "Trop de demandes, réessaie dans quelques minutes." };
    }
    console.error("resetPasswordForEmail failed", error);
  }
  return { email, notice: RESET_NOTICE };
}

export type UpdatePasswordState = AuthFormState & { done?: boolean; expired?: boolean };

/** Sets the new password of the user whose session comes from the reset link. */
export async function updatePassword(_previous: UpdatePasswordState, formData: FormData): Promise<UpdatePasswordState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Le changement de mot de passe n’est pas disponible dans la démo." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "Choisis un mot de passe différent de l’ancien." };
    if (error.code === "weak_password") {
      return { error: "Ce mot de passe est trop faible. Choisis-en un plus long ou plus varié." };
    }
    if (error.name === "AuthSessionMissingError" || error.status === 401 || error.code === "session_not_found") {
      return { expired: true, error: "Ce lien a expiré ou a déjà servi." };
    }
    console.error("updateUser failed", error);
    return { error: "Impossible de changer le mot de passe pour le moment. Réessaie dans un instant." };
  }
  return { done: true };
}

/**
 * Turns the guest into a real account: Supabase sends a confirmation to the new address; once it
 * is confirmed the same user (same id, all data kept) chooses a password on /nouveau-mot-de-passe.
 */
export async function upgradeGuestAccount(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = upgradeGuestSchema.safeParse({ email });
  if (!parsed.success) return { email, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { email, error: UNAVAILABLE };

  // Validated with Supabase Auth: only a guest session can be converted.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");
  if (!data.user.is_anonymous) return { email, error: "Ton compte est déjà créé." };

  const origin = await requestOrigin();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${origin}/auth/confirm?next=/nouveau-mot-de-passe` },
  );
  // An address that already has an account gets the same answer as a free one, so the form cannot
  // be used to find out who has an account (same rule as the password reset).
  const taken = error?.code === "email_exists" || (error?.status === 422 && /already|registered/i.test(error.message ?? ""));
  if (error && !taken) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return { email, error: "Trop de demandes, réessaie dans quelques minutes." };
    }
    console.error("updateUser (guest e-mail) failed", error);
    return { email, error: "Impossible de créer le compte pour le moment. Réessaie dans un instant." };
  }
  return { email, notice: UPGRADE_NOTICE };
}

const UPGRADE_NOTICE =
  "Ouvre le lien reçu par e-mail pour confirmer ton adresse, puis choisis ton mot de passe. Ta progression est conservée. Rien reçu ? Pense aux spams ; si cette adresse a déjà un compte, connecte-toi avec (la progression de l’essai ne sera alors pas reprise).";

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/connexion");
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.");
  const protocol = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${protocol}://${host}`;
}

export type DeleteAccountState = { error?: string };

/**
 * Deletes the signed-in account for good. The user must type their e-mail address to confirm;
 * a guest has none, so they type « supprimer ».
 */
export async function deleteAccount(_previous: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Mode démonstration : il n’y a pas de compte à supprimer." };

  // Validated with Supabase Auth: the id to delete is the session's, never one sent by the client.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");

  const typed = String(formData.get("confirmation") ?? "").trim().toLowerCase();
  if (data.user.is_anonymous) {
    if (typed !== GUEST_DELETE_WORD) return { error: `Saisis « ${GUEST_DELETE_WORD} » pour confirmer.` };
  } else if (typed !== data.user.email?.toLowerCase()) {
    return { error: "Saisis ton adresse e-mail exacte pour confirmer." };
  }

  try {
    await deleteUserAccount(data.user.id);
  } catch (error) {
    console.error(error);
    return { error: "Le compte n’a pas pu être supprimé. Réessaie dans un instant." };
  }
  // The user no longer exists server-side: only clear the cookies.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/connexion");
}

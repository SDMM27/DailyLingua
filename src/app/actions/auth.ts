"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInSchema, signUpSchema } from "@/lib/schemas/auth";
import { deleteUserAccount } from "@/lib/supabase/delete-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; notice?: string; email?: string };

const UNAVAILABLE = "La connexion n’est pas disponible pour le moment.";

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { email, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { email, error: UNAVAILABLE };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
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
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    return { email, error: error.status === 422 ? error.message : "Impossible de créer le compte pour le moment." };
  }
  // With e-mail confirmation on there is no session yet: the link in the e-mail finishes the job.
  if (!data.session) {
    return { email, notice: "Compte créé. Ouvre le lien reçu par e-mail pour confirmer ton adresse." };
  }
  redirect("/");
}

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

/** Deletes the signed-in account for good. The user must type their e-mail address to confirm. */
export async function deleteAccount(_previous: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Mode démonstration : il n’y a pas de compte à supprimer." };

  // Validated with Supabase Auth: the id to delete is the session's, never one sent by the client.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");

  const typed = String(formData.get("confirmation") ?? "").trim().toLowerCase();
  if (typed !== data.user.email?.toLowerCase()) {
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

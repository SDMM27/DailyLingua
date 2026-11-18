import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { UpgradeGuestForm } from "@/components/auth/upgrade-guest-form";
import { getRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Créer mon compte" };

/** A guest turns their trial account into a real one; everything done so far is kept. */
export default async function CreateAccountPage() {
  const repo = await getRepository();
  if (!repo.isGuest) redirect("/");

  return (
    <AuthLayout eyebrow="Compte d’essai" title="Créer mon compte" form={<UpgradeGuestForm />}>
      Ton compte garde tout ce que tu as fait pendant l’essai : langues, missions, vocabulaire et progression.
      Indique ton adresse e-mail : tu recevras un lien pour la confirmer et choisir ton mot de passe.
    </AuthLayout>
  );
}

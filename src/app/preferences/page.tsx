import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, HistoryIcon, InfoIcon, PenIcon, PhoneIcon } from "@/components/icons";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { Card, Eyebrow, PageHeader } from "@/components/ui/primitives";
import { signOut } from "@/app/actions/auth";
import { DeleteAccount } from "@/components/auth/delete-account";
import { getRepository, requirePreferences } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Préférences" };

export default async function PreferencesPage() {
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const [email, languages] = await Promise.all([repo.getAccountEmail(), repo.listAvailableLanguages()]);
  return (
    <>
      <PageHeader eyebrow="Réglages" title="Préférences">
        Tes langues, ton temps et tes centres d’intérêt guident le choix des contenus de chaque matin.
      </PageHeader>
      <Link
        href="/historique"
        className="mb-6 flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
      >
        <HistoryIcon className="text-ink-soft" />
        <span className="flex-1 font-semibold">Historique des missions</span>
        <ArrowRightIcon width={16} height={16} className="text-muted" />
      </Link>
      <Link
        href="/niveau"
        className="mb-6 flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
      >
        <CheckIcon className="text-ink-soft" />
        <span className="flex-1 font-semibold">Test de niveau</span>
        <ArrowRightIcon width={16} height={16} className="text-muted" />
      </Link>
      <Link
        href="/installer"
        className="mb-6 flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
      >
        <PhoneIcon className="text-ink-soft" />
        <span className="flex-1 font-semibold">Installer sur l’écran d’accueil</span>
        <ArrowRightIcon width={16} height={16} className="text-muted" />
      </Link>
      <PreferencesForm initial={preferences} languages={languages} persist={!repo.isDemo} />
      {email && (
        <Card className="mt-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>Compte</Eyebrow>
            <p className="mt-1 truncate text-sm">{email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
            >
              Se déconnecter
            </button>
          </form>
        </Card>
      )}
      {email && <DeleteAccount email={email} />}
      <div className="mt-6 space-y-3">
      <Link
        href="/retour?depuis=/preferences"
        className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
      >
        <PenIcon className="text-ink-soft" />
        <span className="flex-1 font-semibold">Envoyer un retour</span>
        <ArrowRightIcon width={16} height={16} className="text-muted" />
      </Link>
      <Link
        href="/confidentialite"
        className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
      >
        <InfoIcon className="text-ink-soft" />
        <span className="flex-1 font-semibold">Confidentialité</span>
        <ArrowRightIcon width={16} height={16} className="text-muted" />
      </Link>
      </div>
    </>
  );
}

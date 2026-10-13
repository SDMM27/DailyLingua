import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, HistoryIcon, PhoneIcon } from "@/components/icons";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { PageHeader } from "@/components/ui/primitives";
import { getRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Préférences" };

export default async function PreferencesPage() {
  const preferences = await (await getRepository()).getPreferences();
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
        href="/installer"
        className="mb-6 flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
      >
        <PhoneIcon className="text-ink-soft" />
        <span className="flex-1 font-semibold">Installer sur l’écran d’accueil</span>
        <ArrowRightIcon width={16} height={16} className="text-muted" />
      </Link>
      <PreferencesForm initial={preferences} />
    </>
  );
}

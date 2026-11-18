import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, CheckIcon, HistoryIcon, InfoIcon, PenIcon, PhoneIcon } from "@/components/icons";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { SourceAccessList } from "@/components/preferences/source-access-list";
import { buttonClass, Columns, Eyebrow, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { signOut } from "@/app/actions/auth";
import { DeleteAccount } from "@/components/auth/delete-account";
import { getRepository, requirePreferences } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Préférences" };

/** A line of the side column: icon, label, arrow, closed by a thin rule. */
function NavRow({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="border-t border-line first:border-t-0">
      <Link href={href} className="flex min-h-14 items-center gap-3 py-3 transition-colors hover:text-accent-strong">
        <span className="text-ink-soft">{icon}</span>
        <span className="flex-1 font-semibold">{children}</span>
        <ArrowRightIcon width={16} height={16} className="text-muted" />
      </Link>
    </li>
  );
}

export default async function PreferencesPage() {
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const [email, languages, paidSources] = await Promise.all([
    repo.getAccountEmail(),
    repo.listAvailableLanguages(),
    repo.listPaidSources(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Réglages" title="Préférences">
        Tes langues, ton temps et tes centres d’intérêt guident le choix des contenus de chaque matin.
      </PageHeader>
      <Columns
        main={<PreferencesForm initial={preferences} languages={languages} persist={!repo.isDemo} />}
        aside={
          <div className="space-y-8">
            <ul className="border-y border-ink">
              <NavRow href="/historique" icon={<HistoryIcon />}>
                Historique des missions
              </NavRow>
              <NavRow href="/niveau" icon={<CheckIcon />}>
                Test de niveau
              </NavRow>
              <NavRow href="/installer" icon={<PhoneIcon />}>
                Installer sur l’écran d’accueil
              </NavRow>
            </ul>
            {paidSources.length > 0 && (
              <section>
                <SectionTitle>Mes abonnements</SectionTitle>
                <p className="mb-3 text-sm leading-relaxed text-ink-soft">
                  Coche les sources payantes que tu peux lire : leurs contenus pourront entrer dans tes missions.
                </p>
                <SourceAccessList sources={paidSources} readOnly={repo.isDemo} />
              </section>
            )}
            {repo.isGuest && (
              <section className="border-t border-ink pt-5">
                <Eyebrow>Compte d’essai</Eyebrow>
                <p className="mt-2 text-sm text-ink-soft">
                  Tu n’as pas encore de compte : ta progression n’existe que sur ce navigateur.
                </p>
                <Link href="/creer-mon-compte" className={`${buttonClass.primary} mt-4`}>
                  Créer mon compte
                </Link>
                <form action={signOut} className="mt-5 border-t border-line pt-4">
                  <p className="text-xs leading-relaxed text-muted">
                    Si tu te déconnectes, tu perds ton essai et tout ce que tu as fait : il n’y a aucun moyen de le
                    retrouver.
                  </p>
                  <button type="submit" className={`${buttonClass.secondary} mt-3 !border-line !text-ink-soft`}>
                    Se déconnecter et perdre l’essai
                  </button>
                </form>
              </section>
            )}
            {email && (
              <section className="flex items-center justify-between gap-4 border-t border-ink pt-5">
                <div className="min-w-0">
                  <Eyebrow>Compte</Eyebrow>
                  <p className="mt-1 truncate text-sm">{email}</p>
                </div>
                <form action={signOut}>
                  <button type="submit" className={`${buttonClass.secondary} shrink-0 !border-line !text-ink-soft`}>
                    Se déconnecter
                  </button>
                </form>
              </section>
            )}
            {(email || repo.isGuest) && <DeleteAccount email={email} />}
            <ul className="border-y border-ink">
              <NavRow href="/retour?depuis=/preferences" icon={<PenIcon />}>
                Envoyer un retour
              </NavRow>
              <NavRow href="/confidentialite" icon={<InfoIcon />}>
                Confidentialité
              </NavRow>
            </ul>
          </div>
        }
      />
    </>
  );
}

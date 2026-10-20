import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/primitives";

/** Shown instead of the mission once a guest has used their trial days. */
export function TrialOverCard() {
  return (
    <Card>
      <Eyebrow>Mission du jour</Eyebrow>
      <p className="mt-2 font-serif text-lg">Ton essai est terminé.</p>
      <p className="mt-2 text-sm text-ink-soft">
        Crée ton compte pour continuer : tout ce que tu as fait pendant l’essai est conservé.
      </p>
      <Link
        href="/creer-mon-compte"
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-paper"
      >
        Créer mon compte
      </Link>
    </Card>
  );
}

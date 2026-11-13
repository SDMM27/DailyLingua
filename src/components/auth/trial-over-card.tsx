import Link from "next/link";
import { buttonClass, Card, Eyebrow } from "@/components/ui/primitives";

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
        className={`${buttonClass.primary} mt-4`}
      >
        Créer mon compte
      </Link>
    </Card>
  );
}

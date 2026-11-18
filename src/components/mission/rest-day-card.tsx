import Link from "next/link";
import { buttonClass, Card, Eyebrow } from "@/components/ui/primitives";

/** Shown instead of the mission on a weekday when none of the learner's languages is worked. */
export function RestDayCard({ homeLink = false }: { homeLink?: boolean }) {
  return (
    <Card>
      <Eyebrow>Jour de repos</Eyebrow>
      <p className="mt-2 max-w-[68ch] font-serif text-xl leading-relaxed">
        Pas de mission aujourd’hui : c’est un jour de repos. Les révisions restent disponibles.
      </p>
      {homeLink && (
        <Link href="/" className={`${buttonClass.primary} mt-4`}>
          Retour à l’accueil
        </Link>
      )}
    </Card>
  );
}

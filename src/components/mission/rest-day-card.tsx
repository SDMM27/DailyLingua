import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/primitives";

/** Shown instead of the mission on a weekday when none of the learner's languages is worked. */
export function RestDayCard({ homeLink = false }: { homeLink?: boolean }) {
  return (
    <Card>
      <Eyebrow>Jour de repos</Eyebrow>
      <p className="mt-2 font-serif text-lg">
        Pas de mission aujourd’hui : c’est un jour de repos. Les révisions restent disponibles.
      </p>
      {homeLink && (
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-paper"
        >
          Retour à l’accueil
        </Link>
      )}
    </Card>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AddSquareIcon, CheckIcon, PhoneIcon, ShareIcon } from "@/components/icons";
import { Eyebrow, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Installer l’app" };

interface Step {
  title: string;
  body: ReactNode;
  icon: ReactNode;
}

const ROMAN = ["I", "II", "III", "IV"];

const STEPS: Step[] = [
  {
    title: "Ouvre le site dans Safari",
    body: (
      <>
        Sur iPhone, c’est Safari qui permet d’ajouter un site à l’écran d’accueil. Si tu es dans une autre
        application (Instagram, Messages…), copie le lien et colle-le dans Safari.
      </>
    ),
    icon: <PhoneIcon />,
  },
  {
    title: "Touche le bouton Partager",
    body: (
      <>
        C’est le carré avec une flèche vers le haut, en bas de l’écran (sur certains iPhone, il se cache derrière
        le bouton « … » à droite de la barre d’adresse).
      </>
    ),
    icon: <ShareIcon />,
  },
  {
    title: "Choisis « Sur l’écran d’accueil »",
    body: (
      <>
        Fais défiler le menu vers le bas jusqu’à la ligne <strong>Sur l’écran d’accueil</strong> (icône +). Elle
        peut aussi s’appeler « Ajouter à l’écran d’accueil ».
      </>
    ),
    icon: <AddSquareIcon />,
  },
  {
    title: "Touche « Ajouter »",
    body: (
      <>
        Garde le nom <strong>Lingua</strong> (ou change-le), laisse « Ouvrir comme app web » activé s’il apparaît,
        puis touche <strong>Ajouter</strong> en haut à droite.
      </>
    ),
    icon: <CheckIcon />,
  },
];

export default function InstallPage() {
  return (
    <>
      <PageHeader eyebrow="Tutoriel" title="Daily Lingua sur ton écran d’accueil">
        En 30 secondes, le site devient une app : une icône sur ton iPhone, en plein écran, sans la barre de
        Safari. Pratique pour ouvrir ta mission chaque matin.
      </PageHeader>

      <ol className="grid gap-0 border-t border-ink sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex min-w-0 flex-col gap-3 border-b border-line py-6 sm:border-l sm:px-6 sm:odd:border-l-0 sm:odd:pl-0 sm:even:pr-0 lg:border-b-0 lg:odd:border-l lg:odd:pl-6 lg:even:pr-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-serif text-5xl leading-none font-extrabold text-accent-strong" aria-hidden="true">
                {ROMAN[index]}
              </span>
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-sunk text-ink-soft"
                aria-hidden="true"
              >
                {step.icon}
              </span>
            </div>
            <div className="min-w-0">
              <Eyebrow className="mb-1">Étape {index + 1}</Eyebrow>
              <h2 className="font-serif text-xl leading-snug font-bold">{step.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="border-t border-ink pt-6">
        <h2 className="font-serif text-2xl font-bold tracking-tight italic">Et ensuite ?</h2>
        <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
          L’icône <strong>Lingua</strong> apparaît sur ton écran d’accueil. Ouvre-la comme n’importe quelle
          application : tu retrouves ta mission du jour, tes mots et ton historique.
        </p>
        <p className="mt-3 max-w-[68ch] text-[13px] leading-relaxed text-muted">
          Pas d’option « Sur l’écran d’accueil » ? Vérifie que tu es bien dans Safari (et pas dans une vue
          intégrée à une autre app) et que ton iPhone est à jour.
        </p>
      </section>

      <p className="mt-6 text-center text-[13px] text-muted">
        <Link href="/confidentialite" className="underline underline-offset-4">
          Politique de confidentialité
        </Link>
      </p>
    </>
  );
}

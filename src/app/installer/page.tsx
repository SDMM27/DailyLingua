import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AddSquareIcon, CheckIcon, PhoneIcon, ShareIcon } from "@/components/icons";
import { Card, Eyebrow, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Installer l’app" };

interface Step {
  title: string;
  body: ReactNode;
  icon: ReactNode;
}

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

      <ol className="space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card className="flex gap-4">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-sunk text-ink-soft"
                aria-hidden="true"
              >
                {step.icon}
              </span>
              <div className="min-w-0">
                <Eyebrow className="mb-1">Étape {index + 1}</Eyebrow>
                <h2 className="font-serif text-lg leading-snug font-semibold">{step.title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="mt-6">
        <h2 className="font-serif text-lg font-semibold">Et ensuite ?</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
          L’icône <strong>Lingua</strong> apparaît sur ton écran d’accueil. Ouvre-la comme n’importe quelle
          application : tu retrouves ta mission du jour, tes mots et ton historique.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Pas d’option « Sur l’écran d’accueil » ? Vérifie que tu es bien dans Safari (et pas dans une vue
          intégrée à une autre app) et que ton iPhone est à jour.
        </p>
      </Card>
    </>
  );
}

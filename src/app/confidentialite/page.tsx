import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Politique de confidentialité" };

/** Update this date whenever the policy changes. */
const LAST_UPDATED = "20 octobre 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

const list = "list-disc space-y-1.5 pl-5";

export default function PrivacyPage() {
  // Optional, server side: no address is written in the code.
  const contactEmail = process.env.CONTACT_EMAIL?.trim();

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Version bêta" title="Politique de confidentialité">
        Daily Lingua est en bêta privée. Voici, simplement, ce que l’app fait de tes données. Dernière mise à jour :{" "}
        {LAST_UPDATED}.
      </PageHeader>

      <Section title="Qui est responsable ?">
        <p>
          Le responsable du traitement est l’éditeur de Daily Lingua.{" "}
          {contactEmail ? (
            <>
              Pour toute question ou demande, écris à{" "}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-ink underline">
                {contactEmail}
              </a>
              , ou utilise la page « Envoyer un retour » de l’app.
            </>
          ) : (
            <>Pour toute question ou demande, utilise la page « Envoyer un retour » de l’app.</>
          )}
        </p>
      </Section>

      <Section title="Les données que nous collectons">
        <ul className={list}>
          <li>Ton adresse e-mail et ton mot de passe (géré par Supabase Auth, qui ne le stocke que haché).</li>
          <li>
            Tes préférences : langues, niveaux, objectifs, centres d’intérêt, temps quotidien, fuseau horaire et
            heure de la mission.
          </li>
          <li>Tes missions, ta progression et tes réponses aux quiz.</li>
          <li>Les textes que tu écris pour les productions écrites, leurs corrections et les cartes d’erreurs à revoir.</li>
          <li>Ton vocabulaire, tes listes de mots et tes révisions.</li>
          <li>Les retours que tu envoies depuis l’app.</li>
        </ul>
        <p>
          Il n’y a ni publicité, ni traceur, ni outil de mesure d’audience, et tes données ne sont jamais revendues.
          Le seul cookie est celui de ta session de connexion : il est strictement nécessaire au fonctionnement du
          service, c’est pourquoi aucun bandeau de consentement n’est affiché.
        </p>
      </Section>

      <Section title="L’essai sans compte">
        <p>
          Si tu choisis « Essayer sans compte », aucune adresse e-mail n’est demandée : un compte d’essai est créé et
          ses données sont liées au cookie de session de ce navigateur. Si tu te déconnectes ou si tu effaces tes
          cookies, tu ne peux plus le retrouver et ses données sont perdues. Un compte d’essai inactif est supprimé
          automatiquement au bout de 30 jours. Si tu le transformes en compte complet, tout est conservé.
        </p>
      </Section>

      <Section title="Pourquoi, et sur quelle base légale ?">
        <p>
          Tes données servent uniquement à fournir le service : te connecter, choisir les contenus de ta mission,
          suivre ta progression et gérer ton vocabulaire. La base légale est l’exécution du contrat (RGPD, art. 6.1.b).
        </p>
      </Section>

      <Section title="Qui traite tes données ?">
        <ul className={list}>
          <li>
            <strong>Supabase</strong> : base de données et authentification.
          </li>
          <li>
            <strong>Vercel</strong> : hébergement de l’application.
          </li>
          <li>
            <strong>Anthropic</strong> : rédaction des exercices de la mission, correction de tes textes et traduction des
            mots que tu importes. Pour les
            exercices, le modèle reçoit le titre, l’accroche, le média, le type, le niveau habituel et la durée des
            contenus proposés, ainsi que ton niveau, ton niveau visé, ton objectif libre s’il est renseigné, tes
            centres d’intérêt, le temps prévu et la date. Pour la correction, il reçoit le texte que tu as écrit, la
            consigne, la langue, ton niveau, ton niveau visé et ton objectif. Pour la traduction, il reçoit les mots
            que tu demandes à traduire automatiquement (sans leur exemple ni le reste de ton vocabulaire) et leur
            langue, et seulement si ton compte est complet. Il ne reçoit jamais ton adresse e-mail, ni le reste de
            ton vocabulaire, ni tes réponses aux quiz. Anthropic n’utilise pas les données reçues par son API pour
            entraîner ses modèles.
          </li>
          <li>
            <strong>Google (YouTube)</strong> : le lecteur vidéo n’est chargé que lorsque tu touches « lecture »,
            depuis youtube-nocookie.com. À partir de là, Google reçoit ton adresse IP et les données de lecture, selon
            ses propres règles ; rien ne lui est envoyé avant (pas de miniature, pas de cookie).
          </li>
          <li>
            <strong>Le service d’envoi d’e-mails</strong> configuré dans Supabase, pour les messages de confirmation et
            de réinitialisation du mot de passe.
          </li>
        </ul>
        <p>
          Certains de ces prestataires peuvent traiter des données en dehors de l’Union européenne. Les transferts sont
          alors encadrés par les clauses contractuelles types de la Commission européenne.
        </p>
      </Section>

      <Section title="Combien de temps ?">
        <p>
          Tes données sont conservées tant que ton compte existe. Tu peux les supprimer à tout moment, immédiatement et
          définitivement, depuis{" "}
          <Link href="/preferences" className="font-semibold text-ink underline">
            Préférences
          </Link>{" "}
          → « Supprimer mon compte » : toutes tes données personnelles sont effacées, y compris les retours que tu as
          envoyés.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu disposes des droits d’accès, de rectification, d’effacement, de portabilité et d’opposition sur tes
          données. Tu peux modifier tes préférences et supprimer ton compte toi-même dans l’app ; pour les autres
          demandes, contacte-nous comme indiqué plus haut. Si tu estimes que tes droits ne sont pas respectés, tu peux
          adresser une réclamation à la CNIL (
          <a href="https://www.cnil.fr" className="font-semibold text-ink underline" rel="noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </Section>

      <Section title="Les contenus des médias">
        <p>
          Les articles, podcasts et vidéos appartiennent à leurs éditeurs. L’app n’affiche que le titre, l’accroche et
          un lien vers l’éditeur : le contenu lui-même se lit ou s’écoute sur son site.
        </p>
      </Section>

      <p className="px-1 pb-2 text-[13px] text-muted">
        <Link href="/" className="underline">
          Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}

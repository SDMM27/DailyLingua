import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GuestTrialForm } from "@/components/auth/guest-trial-form";
import { languageStyle } from "@/components/ui/language-style";
import { Card, DemoNotice, Eyebrow, LanguageTag, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { buildMockMission } from "@/lib/data/mock/mission";
import { GUEST_TRIAL_DAYS } from "@/lib/domain/guest-trial";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import { sessionMinutes } from "@/lib/domain/time-budget";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Découvrir Daily Lingua" };

const FEATURES = [
  {
    title: "Une mission chaque matin",
    text: "Un contenu authentique récent dans chacune de tes langues : article, podcast, vidéo, choisi selon ton niveau et ton temps.",
  },
  {
    title: "Des exercices sur ce contenu",
    text: "Compréhension, expressions à retenir, production écrite ou orale : de quoi vraiment travailler le texte, pas seulement le lire.",
  },
  {
    title: "Des révisions de vocabulaire",
    text: "Les mots que tu gardes reviennent juste avant que tu ne les oublies, grâce à la répétition espacée.",
  },
  {
    title: "Un test de niveau",
    text: "Un test court par langue pour régler la difficulté de tes missions.",
  },
];

export default async function DiscoverPage() {
  // Without Supabase the app is the public demo: there is nothing to try.
  const env = getSupabaseEnv();
  if (!env) redirect("/");

  // Already signed in (validated with Supabase Auth, not just the cookie): the app is the home page.
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (data.user) redirect("/");

  const sample = buildMockMission("2026-01-01");

  return (
    <div className="mx-auto max-w-xl space-y-8 pt-6">
      <PageHeader eyebrow="Daily Lingua" title="Une mission de langues chaque matin">
        Lis, écoute et pratique du contenu authentique dans les langues que tu apprends, en quelques minutes par
        jour.
      </PageHeader>

      <ul className="space-y-3">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <Card>
              <h2 className="font-serif text-lg font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{feature.text}</p>
            </Card>
          </li>
        ))}
      </ul>

      <section aria-labelledby="exemple">
        <SectionTitle>
          <span id="exemple">Un exemple de mission</span>
        </SectionTitle>
        <DemoNotice>
          Exemple : les titres sont fictifs, les sources (médias et plateformes) sont réelles. Ta vraie mission
          cite de vrais contenus récents.
        </DemoNotice>
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {sample.sessions.map((session) => {
              const { content } = session;
              return (
                <li key={session.id} className="flex gap-4 px-5 py-4 sm:px-6">
                  <span
                    className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${languageStyle(session.language).bg}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <LanguageTag language={session.language} />
                      <span className="text-xs font-medium text-ink-soft">{sessionMinutes(session)} min</span>
                    </div>
                    <p lang={session.language} className="mt-2 font-serif text-[17px] leading-snug font-medium">
                      {content.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {CONTENT_TYPE_LABELS[content.type]} · {content.source.name} · {content.difficulty}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <Card>
        <Eyebrow>Essai gratuit</Eyebrow>
        <p className="mt-2 font-serif text-lg">
          {GUEST_TRIAL_DAYS} jours d’essai, sans e-mail.
        </p>
        <p className="mt-2 mb-4 text-sm leading-relaxed text-ink-soft">
          Pas d’adresse e-mail à donner pour commencer. Au bout de {GUEST_TRIAL_DAYS} jours de mission, il faudra
          créer un compte pour continuer et garder ta progression.
        </p>
        <GuestTrialForm
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL}
          supabaseKey={env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined}
        />
        <p className="mt-4 text-center text-sm">
          <Link href="/connexion" className="font-semibold text-ink underline underline-offset-4">
            J’ai déjà un compte
          </Link>
        </p>
      </Card>

      <p className="pb-2 text-center text-xs text-muted">
        <Link href="/confidentialite" className="underline underline-offset-4">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GuestTrialForm } from "@/components/auth/guest-trial-form";
import { SampleArticle } from "@/components/landing/sample-article";
import { SrsTimeline } from "@/components/landing/srs-timeline";
import { languageStyle } from "@/components/ui/language-style";
import { buttonClass, Card, DemoNotice, Eyebrow, LanguageTag, SectionTitle } from "@/components/ui/primitives";
import { Ticker, type TickerItem } from "@/components/ui/ticker";
import { buildMockMission } from "@/lib/data/mock/mission";
import { GUEST_TRIAL_DAYS } from "@/lib/domain/guest-trial";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import { sessionMinutes } from "@/lib/domain/time-budget";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Découvrir Daily Lingua" };

const ROMAN = ["I", "II", "III", "IV"];

/** Illustrative headlines (not real publications) for the "Parutions" strip. */
const TICKER: TickerItem[] = [
  { label: "RU", lang: "ru", title: "Городская акустика: как шум меняет пение птиц" },
  { label: "IT", lang: "it", title: "La pausa caffè, un rito che cambia" },
  { label: "ES", lang: "es", title: "El regreso de los mercados de barrio" },
  { label: "DE", lang: "de", title: "Warum Nachtzüge wieder gefragt sind" },
  { label: "JA", lang: "ja", title: "駅弁の新しい楽しみ方" },
  { label: "PT", lang: "pt", title: "O som das cidades depois da chuva" },
];

const FEATURES = [
  {
    title: "Une mission chaque matin",
    text: "Un contenu authentique récent dans chacune de tes langues : article, podcast, vidéo, choisi selon ton niveau et ton temps.",
  },
  {
    title: "Des exercices sur ce contenu",
    text: "Compréhension, expressions à retenir, production écrite, puis à voix haute : de quoi vraiment travailler le texte, pas seulement le lire.",
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
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2 pb-3">
        <Link href="/connexion" className={buttonClass.quiet}>
          J’ai déjà un compte
        </Link>
        <a href="#essai" className={buttonClass.primary}>
          Essai gratuit
        </a>
      </div>

      <p className="sr-only">Les titres du bandeau « Parutions » sont des exemples.</p>
      <Ticker items={TICKER} />

      <section className="grid md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5 py-10 md:pr-10 lg:pr-14">
          <Eyebrow>À la une</Eyebrow>
          <h1 className="sd-display text-[clamp(2.75rem,5.4vw,4.5rem)] leading-none text-balance">
            Une mission de langues chaque matin
          </h1>
          <p className="dropcap max-w-[68ch] font-serif text-xl leading-relaxed text-ink-soft">
            Lis, écoute et pratique du contenu authentique dans les langues que tu apprends, en quelques minutes par
            jour.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <a href="#essai" className={buttonClass.primary}>
              Commencer l’essai gratuit
            </a>
            <span className="text-sm text-muted">{GUEST_TRIAL_DAYS} jours, sans e-mail.</span>
          </div>
        </div>
        <div className="min-w-0 border-t border-line py-10 md:border-t-0 md:border-l md:pl-10 lg:pl-14">
          <SampleArticle />
        </div>
      </section>

      <section aria-labelledby="sommaire" className="border-t border-ink py-10">
        <SectionTitle>
          <span id="sommaire">Au sommaire de chaque mission</span>
        </SectionTitle>
        <ol className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className="flex min-w-0 flex-col gap-2.5 border-b border-line py-5 first:pt-0 last:border-b-0 sm:border-b-0 sm:border-l sm:px-6 sm:py-0 sm:odd:border-l-0 sm:odd:pl-0 sm:even:pr-0 sm:max-lg:nth-[n+3]:mt-6 sm:max-lg:nth-[n+3]:border-t sm:max-lg:nth-[n+3]:pt-6 lg:odd:border-l lg:odd:pl-6 lg:even:pr-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
            >
              <span className="font-serif text-5xl leading-none font-extrabold text-accent-strong" aria-hidden="true">
                {ROMAN[index]}
              </span>
              <h3 className="font-serif text-[22px] leading-tight font-bold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{feature.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="repetition" className="border-t border-ink py-10">
        <SectionTitle
          action={<span className="kicker hidden text-muted sm:block">Répétition espacée · intervalles d’exemple</span>}
        >
          <span id="repetition">Un mot revient juste avant l’oubli</span>
        </SectionTitle>
        <div className="pt-6">
          <SrsTimeline />
        </div>
      </section>

      <section aria-labelledby="exemple" className="border-t border-ink py-10">
        <SectionTitle>
          <span id="exemple">Un exemple de mission</span>
        </SectionTitle>
        <DemoNotice>
          Exemple : les titres sont fictifs, les sources (médias et plateformes) sont réelles. Ta vraie mission
          cite de vrais contenus récents.
        </DemoNotice>
        <ul className="grid md:grid-cols-2">
          {sample.sessions.map((session) => {
            const { content } = session;
            return (
              <li
                key={session.id}
                className="min-w-0 border-b border-line py-5 last:border-b-0 md:border-b-0 md:border-l md:px-6 md:py-0 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <LanguageTag language={session.language} />
                  <span className="kicker text-muted">{sessionMinutes(session)} min</span>
                </div>
                <p
                  lang={session.language}
                  className={`mt-3 font-serif text-[22px] leading-snug font-bold ${languageStyle(session.language).text}`}
                >
                  {content.title}
                </p>
                <p className="mt-1.5 text-xs text-muted">
                  {CONTENT_TYPE_LABELS[content.type]} · {content.source.name} · {content.difficulty}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="essai" className="scroll-mt-4 border-t border-ink py-10">
        <div className="grid gap-6 md:grid-cols-2 md:gap-0">
          <div className="md:pr-10 lg:pr-14">
            <Eyebrow>Essai gratuit</Eyebrow>
            <p className="mt-2 font-serif text-3xl leading-tight font-bold">
              {GUEST_TRIAL_DAYS} jours d’essai, sans e-mail.
            </p>
            <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
              Pas d’adresse e-mail à donner pour commencer. Au bout de {GUEST_TRIAL_DAYS} jours de mission, il
              faudra créer un compte pour continuer et garder ta progression.
            </p>
          </div>
          <div className="md:border-l md:border-line md:pl-10 lg:pl-14">
            <Card className="max-w-lg">
              <GuestTrialForm
                supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL}
                supabaseKey={env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined}
              />
              <p className="mt-4 text-center text-sm">
                <Link href="/connexion" className="font-semibold text-accent-strong underline underline-offset-4">
                  J’ai déjà un compte
                </Link>
              </p>
            </Card>
          </div>
        </div>
      </section>

      <p className="border-t border-ink pt-4 pb-2 text-center text-xs text-muted">
        <Link href="/confidentialite" className="underline underline-offset-4">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  );
}

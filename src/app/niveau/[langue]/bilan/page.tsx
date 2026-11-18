import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AssessmentProfile } from "@/components/assessment/assessment-profile";
import { AssessmentRunner } from "@/components/assessment/assessment-runner";
import { StartAssessmentButton } from "@/components/assessment/start-assessment-button";
import { buttonClass, Columns, DemoNotice, Eyebrow, PageHeader } from "@/components/ui/primitives";
import { findDossier, isDossierVisible, listeningMode, readAssessmentDraftPolicy, visibleDossiers } from "@/lib/assessment/policy";
import { toPublicDossier } from "@/lib/assessment/public-dossier";
import { SPEAKING_CLAIMS } from "@/lib/assessment/speaking-claims";
import { getRepository, requirePreferences } from "@/lib/data/repository";
import { levelsToOffer } from "@/lib/domain/assessment";
import { formatLongDate, toDateKey } from "@/lib/domain/dates";
import { languageInfo } from "@/lib/domain/languages";

export const metadata: Metadata = { title: "Bilan complet" };
// Grading (server action called from this page) waits for the language model.
export const maxDuration = 120;

const LINK = "font-medium text-accent-strong underline underline-offset-2";

export default async function AssessmentPage({ params }: { params: Promise<{ langue: string }> }) {
  await connection();
  const { langue } = await params;
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const goal = preferences.goals.find((g) => g.language === langue);
  if (!goal) notFound();

  const info = languageInfo(goal.language);
  const header = (children?: React.ReactNode) => (
    <PageHeader eyebrow={`Bilan complet · ${info.nameFr}`} title="Où en es-tu, compétence par compétence ?">
      {children}
    </PageHeader>
  );
  const backToLevels = (
    <Link href="/niveau" className={`${buttonClass.quiet} mt-6 -ml-3`}>
      Retour aux niveaux
    </Link>
  );

  // The demo has no account to save to, and a guest cannot take the assessment (it calls a paid model).
  const guestTrial = await repo.getGuestTrial();
  if (repo.isDemo || guestTrial) {
    return (
      <>
        {header()}
        {repo.isDemo && <DemoNotice>Mode démonstration : le bilan complet n’est pas disponible.</DemoNotice>}
        <section className="max-w-[68ch] border-t border-ink pt-5">
          <Eyebrow>Un compte est nécessaire</Eyebrow>
          <p className="mt-2 font-serif text-lg leading-relaxed text-ink-soft">
            Le bilan complet garde tes réponses pour que tu puisses le reprendre plus tard, et règle ton niveau d’écriture. Il
            demande donc un compte.
          </p>
          {!repo.isDemo && (
            <Link
              href="/creer-mon-compte"
              className={`${buttonClass.primary} mt-5`}
            >
              Créer mon compte
            </Link>
          )}
        </section>
        {backToLevels}
      </>
    );
  }

  const policy = readAssessmentDraftPolicy();
  const visible = visibleDossiers(goal.language, goal.level, policy);
  const [current, assessments] = await Promise.all([
    repo.getCurrentAssessment(goal.language),
    repo.listAssessments(goal.language),
  ]);

  // An assessment in progress: its dossier is the one stored, whatever the learner's level now.
  const inProgress = current ? findDossier(goal.language, current.dossierId) : undefined;
  if (current && inProgress && isDossierVisible(inProgress, policy)) {
    return (
      <AssessmentRunner
        assessmentId={current.id}
        dossier={toPublicDossier(inProgress, listeningMode(inProgress, policy))}
        answers={current.answers}
        listeningPlays={current.listeningPlays}
        claims={SPEAKING_CLAIMS}
      />
    );
  }

  const latest = assessments.find((a) => a.status === "graded" && a.results !== null);
  if (latest?.results) {
    const dossier = findDossier(goal.language, latest.dossierId);
    // A harder dossier is offered only if one can be taken.
    const higher = dossier ? levelsToOffer(dossier.level, latest.results)[0] : undefined;
    const higherLevel = higher && visibleDossiers(goal.language, higher, policy).length > 0 ? higher : null;
    const gradedOn = latest.gradedAt ? formatLongDate(toDateKey(new Date(latest.gradedAt), preferences.timeZone)) : null;
    return (
      <>
        {header(gradedOn ? <>Fait le {gradedOn}.</> : null)}
        <AssessmentProfile
          assessmentId={latest.id}
          language={goal.language}
          results={latest.results}
          // The results screen only needs the prompts: no script, no reference answer.
          dossier={dossier ? toPublicDossier(dossier, "unavailable") : null}
          currentLevel={goal.level}
          latest
          higherLevel={higherLevel}
          canRedo={visible.length > 0}
        />
        {backToLevels}
      </>
    );
  }

  if (visible.length === 0) {
    return (
      <>
        {header()}
        <section className="max-w-[68ch] border-t border-ink pt-5">
          <p className="font-serif text-lg leading-relaxed text-ink-soft">
            Le bilan complet n’est pas encore disponible pour {info.nameFr.toLowerCase()} à ton niveau ({goal.level}). Le test de
            niveau reste disponible.
          </p>
        </section>
        {backToLevels}
      </>
    );
  }

  return (
    <>
      {header("Un test par compétence, pour savoir précisément ce que tu comprends et ce que tu sais écrire.")}
      <Columns
        main={
          <section aria-label="Comment ça marche" className="max-w-[68ch]">
            <Eyebrow>Comment ça marche</Eyebrow>
            <ul className="mt-3 divide-y divide-line font-serif text-lg leading-relaxed text-ink-soft [&>li]:py-3">
              <li>Compte 20 à 25 minutes.</li>
              <li>
                Quatre étapes : comprendre un texte, comprendre à l’oral, écrire, puis dire ce que tu sais faire à l’oral.
              </li>
              <li>C’est facultatif, et tu peux t’arrêter et reprendre plus tard : tes réponses sont enregistrées au fur et à mesure.</li>
              <li>Tu peux laisser une étape vide : elle ne sera simplement pas évaluée.</li>
              <li>
                Tes réponses sont envoyées à Anthropic pour être corrigées.{" "}
                <Link href="/confidentialite" className={LINK}>
                  En savoir plus
                </Link>
                .
              </li>
            </ul>
          </section>
        }
        aside={
          <div className="border-t border-ink pt-5 lg:border-t-0 lg:pt-0">
            <StartAssessmentButton language={goal.language}>Commencer le bilan</StartAssessmentButton>
            {backToLevels}
          </div>
        }
      />
    </>
  );
}

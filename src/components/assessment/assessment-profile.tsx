"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyAssessmentLevel } from "@/app/actions/assessment";
import { StartAssessmentButton } from "@/components/assessment/start-assessment-button";
import { buttonClass, Eyebrow, ProgressBar } from "@/components/ui/primitives";
import { RuledList, ruledItem } from "@/components/ui/ruled-grid";
import type { PublicDossier } from "@/lib/assessment/public-dossier";
import { ASSESSMENT_SKILLS, SKILL_DESCRIPTIONS, SKILL_NAMES, type AssessmentSkill } from "@/lib/assessment/skill-descriptions";
import { receptionLevel } from "@/lib/domain/assessment";
import { toRoman } from "@/lib/domain/roman";
import type { AssessmentConfidence, AssessmentResults, AssessmentWritingCriterion } from "@/lib/schemas/assessment";
import { CEFR_LEVELS, type CefrLevel, type Language } from "@/lib/schemas/common";

const CONFIDENCE_WORDS: Record<AssessmentConfidence, string> = { low: "faible", medium: "moyenne", high: "élevée" };

const VERDICT_WORDS = { correct: "Juste", partial: "En partie juste", wrong: "Faux" } as const;
const VERDICT_STYLE = { correct: "text-olive", partial: "text-ochre", wrong: "text-danger" } as const;

const CRITERIA: Record<AssessmentWritingCriterion, string> = {
  grammar: "Grammaire",
  vocabulary: "Vocabulaire",
  syntax: "Construction des phrases",
  adequacy: "Réponse à la consigne",
};

/**
 * The result of a graded assessment: one line per skill (what the learner can do, the CEFR level in
 * small, how far to trust it), never an average. The speaking line is the learner's own declaration.
 * Below, the verdict and comment of each question, folded. When the reception level differs from the
 * learner's current level and this is the latest assessment, the learner is asked whether to apply
 * it (the server computes the level from the stored results; the browser sends only the id). No
 * script and no reference answer is ever shown: `dossier` is the public projection.
 */
export function AssessmentProfile({
  assessmentId,
  language,
  results,
  dossier,
  currentLevel,
  latest,
  higherLevel,
  canRedo,
}: {
  assessmentId: string;
  language: Language;
  results: AssessmentResults;
  /** Only to name the questions in the detail; null when the dossier is gone. */
  dossier: PublicDossier | null;
  /** The learner's level for the language now. */
  currentLevel: CefrLevel;
  /** Whether this is the most recent graded assessment of the language. */
  latest: boolean;
  /** Level of a second dossier to offer (and a visible dossier exists there), or null. */
  higherLevel: CefrLevel | null;
  /** A dossier is visible at the learner's level, so the assessment can be taken again. */
  canRedo: boolean;
}) {
  const router = useRouter();
  const reception = receptionLevel(results);
  const [kept, setKept] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<CefrLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setApplying(true);
    setError(null);
    const result = await applyAssessmentLevel({ assessmentId });
    if (!result.ok) {
      setError(result.error);
      setApplying(false);
      return;
    }
    setApplied(result.data.level);
    setApplying(false);
    router.refresh();
  }

  const proposal = latest && reception !== null && reception !== currentLevel && !kept && applied === null;
  const questionLists: { skill: AssessmentSkill; title: string; ids: { id: string; prompt: string }[] }[] = dossier
    ? [
        { skill: "reading", title: SKILL_NAMES.reading, ids: dossier.reading.questions },
        { skill: "listening", title: SKILL_NAMES.listening, ids: dossier.listening.questions },
      ]
    : [];
  const reviewed = results.review.questions;
  const listedIds = new Set(questionLists.flatMap((list) => list.ids.map((q) => q.id)));
  const otherIds = Object.keys(reviewed).filter((id) => !listedIds.has(id));

  return (
    <div className="space-y-8">
      <section aria-labelledby="profile-title" className="border-t border-ink pt-5">
        <Eyebrow>Ton bilan</Eyebrow>
        <h2 id="profile-title" className="sd-display mt-1 text-3xl">
          Ce que tu sais faire
        </h2>
        <RuledList columns={4} className="mt-4 border-t border-line">
          {ASSESSMENT_SKILLS.map((skill, index) => {
            const result = results[skill];
            return (
              <li key={skill} className={ruledItem}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="flex items-baseline gap-2 text-[15px] font-semibold">
                    <span aria-hidden="true" className="font-serif text-xl font-extrabold text-accent-strong">
                      {toRoman(index + 1)}
                    </span>
                    {SKILL_NAMES[skill]}
                  </h3>
                  {skill === "speaking" && result && (
                    <span className="kicker text-muted">Déclaré</span>
                  )}
                </div>
                {result ? (
                  <>
                    <p className="sd-display mt-3 text-6xl leading-none text-accent-strong">
                      <span data-testid={`level-${skill}`}>{result.level}</span>
                    </p>
                    <ProgressBar
                      value={(CEFR_LEVELS.indexOf(result.level) + 1) / CEFR_LEVELS.length}
                      label={`Niveau en ${SKILL_NAMES[skill].toLowerCase()}`}
                      className="mt-3"
                    />
                    <p className="mt-3 font-serif text-[17px] leading-relaxed">{SKILL_DESCRIPTIONS[skill][result.level]}</p>
                    <p className="kicker mt-2 text-muted">
                      confiance {CONFIDENCE_WORDS[result.confidence]}
                      {skill === "speaking" && " · d’après tes affirmations, non vérifié"}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 font-serif text-lg italic text-muted">Non évaluée</p>
                )}
              </li>
            );
          })}
        </RuledList>
        <p className="mt-3 max-w-[68ch] text-xs leading-relaxed text-muted">
          Ce bilan est indicatif : il ne compte que 3 questions par épreuve, donc une erreur d’inattention peut changer le
          résultat.
        </p>
      </section>

      {results.writing && (
        <p className="max-w-[68ch] border-y border-line py-3 font-serif text-lg leading-relaxed text-ink-soft">
          Ton niveau d’écriture a été mis à jour : <strong className="font-semibold text-ink">{results.writing.level}</strong>.
          Les consignes d’écriture de tes missions s’y adaptent.
        </p>
      )}

      {proposal && reception && (
        <section className="max-w-[68ch] border-t border-ink pt-5">
          <Eyebrow>Niveau des contenus</Eyebrow>
          <p className="mt-2 font-serif text-2xl font-bold italic">
            Régler tes contenus sur {reception} ? (actuellement {currentLevel})
          </p>
          <p className="mt-1 font-serif text-lg leading-relaxed text-ink-soft">
            C’est le plus bas de tes niveaux en lecture et en écoute. Il règle la difficulté des articles, des podcasts et des vidéos.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              className={buttonClass.primary}
            >
              {applying ? "Application…" : "Appliquer"}
            </button>
            <button
              type="button"
              onClick={() => setKept(true)}
              disabled={applying}
              className={buttonClass.secondary}
            >
              Garder mon niveau
            </button>
          </div>
          <div aria-live="polite">
            {error && (
              <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </section>
      )}
      {applied && (
        <p role="status" className="rounded-2xl bg-olive-soft px-4 py-3 text-sm font-medium text-olive">
          C’est fait : tes contenus sont réglés sur {applied}.
        </p>
      )}

      <details className="group border-y border-ink">
        <summary className="flex min-h-11 cursor-pointer items-center py-3 font-serif text-xl font-bold italic">
          Voir le détail des corrections
        </summary>
        <div className="grid gap-x-10 gap-y-6 border-t border-line py-5 md:grid-cols-2">
          {questionLists.map((list) => {
            const entries = list.ids.flatMap((q) => (reviewed[q.id] ? [{ ...q, ...reviewed[q.id] }] : []));
            if (entries.length === 0) return null;
            return (
              <section key={list.skill}>
                <h3 className="text-sm font-semibold">{list.title}</h3>
                <ul className="mt-2 space-y-3">
                  {entries.map((entry) => (
                    <li key={entry.id} className="text-sm leading-relaxed">
                      <p className="text-ink-soft">{entry.prompt}</p>
                      <p>
                        <span className={`font-semibold ${VERDICT_STYLE[entry.verdict]}`}>{VERDICT_WORDS[entry.verdict]}</span>
                        {" — "}
                        <span>{entry.comment}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {otherIds.length > 0 && (
            <ul className="space-y-3">
              {otherIds.map((id) => (
                <li key={id} className="text-sm leading-relaxed">
                  <span className={`font-semibold ${VERDICT_STYLE[reviewed[id].verdict]}`}>{VERDICT_WORDS[reviewed[id].verdict]}</span>
                  {" — "}
                  <span>{reviewed[id].comment}</span>
                </li>
              ))}
            </ul>
          )}
          {results.review.writing && (
            <section>
              <h3 className="text-sm font-semibold">{SKILL_NAMES.writing}</h3>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {(Object.keys(CRITERIA) as AssessmentWritingCriterion[]).map((criterion) => (
                  <li key={criterion} className="flex justify-between gap-2">
                    <span className="text-ink-soft">{CRITERIA[criterion]}</span>
                    <span className="font-semibold">{results.review.writing?.scores[criterion]}/5</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-relaxed">{results.review.writing.comment}</p>
            </section>
          )}
          {Object.keys(reviewed).length === 0 && !results.review.writing && (
            <p className="text-sm text-muted">Aucune réponse n’a été corrigée.</p>
          )}
        </div>
      </details>

      {(higherLevel || canRedo) && (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          {higherLevel && (
            <div>
              <StartAssessmentButton language={language} higher variant="secondary">
                Essayer un dossier de niveau {higherLevel}
              </StartAssessmentButton>
              <p className="mt-2 text-xs text-muted">Facultatif : ton niveau a été confirmé, tu peux voir si tu vas plus haut.</p>
            </div>
          )}
          {canRedo && (
            <StartAssessmentButton language={language} variant={higherLevel ? "secondary" : "primary"}>
              Refaire mon bilan
            </StartAssessmentButton>
          )}
        </div>
      )}
    </div>
  );
}

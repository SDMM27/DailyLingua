"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { gradeAssessment, saveAssessmentAnswers } from "@/app/actions/assessment";
import { DraftScript } from "@/components/assessment/draft-script";
import { ListeningPlayer } from "@/components/assessment/listening-player";
import { YouTubeListeningPlayer } from "@/components/assessment/youtube-listening-player";
import { ArrowRightIcon } from "@/components/icons";
import { buttonClass, Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import type { PublicDossier, PublicQuestion } from "@/lib/assessment/public-dossier";
import { SKILL_NAMES } from "@/lib/assessment/skill-descriptions";
import type { SpeakingClaim } from "@/lib/assessment/speaking-claims";
import {
  ASSESSMENT_STEPS,
  firstOpenStep,
  LISTENING_MAX_PLAYS,
  type AssessmentStep,
  type AssessmentStepDefinition,
} from "@/lib/domain/assessment";
import { languageInfo } from "@/lib/domain/languages";
import { toRoman } from "@/lib/domain/roman";
import { ASSESSMENT_ANSWER_MAX, ASSESSMENT_WRITING_MAX, type AssessmentAnswers } from "@/lib/schemas/assessment";

/** The answers are saved this long after the last keystroke. */
export const SAVE_DELAY_MS = 2000;

/** A counter shows once an answer is this close to its limit (share of the limit). */
const COUNTER_FROM = 0.8;

interface Snapshot {
  answers: AssessmentAnswers;
  plays: number;
}

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

type View = { kind: "steps" } | { kind: "recap" } | { kind: "grading" } | { kind: "problem"; message: string; canRetry: boolean };

const isFilled = (value: string | undefined) => value !== undefined && value.trim() !== "";

const BUTTON_PRIMARY = buttonClass.primary;
const BUTTON_SECONDARY = buttonClass.secondary;

/** A multi-line answer: label tied to the field, hint, counter near the limit. */
function AnswerField({
  label,
  value,
  max,
  rows = 4,
  hintId,
  lang,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  max: number;
  rows?: number;
  /** Id of the paragraph that explains how to answer. */
  hintId: string;
  lang: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const id = useId();
  const counterId = `${id}-count`;
  const showCounter = value.length >= max * COUNTER_FROM;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-serif text-lg leading-snug font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        lang={lang}
        dir="auto"
        rows={rows}
        value={value}
        maxLength={max}
        aria-describedby={showCounter ? `${hintId} ${counterId}` : hintId}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="block w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-base leading-relaxed placeholder:text-muted focus:border-ink focus:outline-none"
      />
      {showCounter && (
        <p id={counterId} className={`mt-1 text-end text-xs ${value.length >= max ? "text-danger" : "text-muted"}`}>
          {value.length} / {max} caractères
        </p>
      )}
    </div>
  );
}

/** What the recap says about the answers, mirroring what the grading will do with them. */
function recapLines(dossier: PublicDossier, snapshot: Snapshot, claims: SpeakingClaim[]) {
  const { answers, plays } = snapshot;
  const unanswered = (questions: PublicQuestion[]) => questions.filter((q) => !isFilled(answers.questions[q.id])).length;
  const readingMissing = unanswered(dossier.reading.questions);
  const listeningMissing = unanswered(dossier.listening.questions);
  const claimsAnswered = claims.filter((c) => answers.speaking[c.id] !== undefined).length;
  return {
    reading: { empty: readingMissing === dossier.reading.questions.length, missing: readingMissing },
    listening: {
      empty: listeningMissing === dossier.listening.questions.length && plays === 0,
      missing: listeningMissing,
    },
    writing: { empty: !isFilled(answers.writing) },
    speaking: { empty: claimsAnswered === 0, missing: claims.length - claimsAnswered },
  };
}

const countLabel = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * The four steps of the skills assessment: reading, listening, writing, speaking (declared). Answers
 * are saved as they come (on a change of step, when a field loses focus, `SAVE_DELAY_MS` after the
 * last keystroke, and at once for a listening), one request at a time, the last state winning. A step
 * may stay empty: the recap says what will not be assessed. It only knows the public dossier, never
 * the script (except a marked draft) nor the reference answers.
 */
export function AssessmentRunner({
  assessmentId,
  dossier,
  answers: initialAnswers,
  listeningPlays,
  claims,
}: {
  assessmentId: string;
  dossier: PublicDossier;
  answers: AssessmentAnswers;
  listeningPlays: number;
  claims: SpeakingClaim[];
}) {
  const router = useRouter();
  const info = languageInfo(dossier.language);
  const hintId = useId();

  const definitions: AssessmentStepDefinition[] = [
    { step: "reading", ids: dossier.reading.questions.map((q) => q.id) },
    { step: "listening", ids: dossier.listening.questions.map((q) => q.id) },
    { step: "writing", ids: [] },
    { step: "speaking", ids: claims.map((c) => c.id) },
  ];

  const [snapshot, setSnapshot] = useState<Snapshot>({ answers: initialAnswers, plays: listeningPlays });
  const [stepIndex, setStepIndex] = useState(() =>
    ASSESSMENT_STEPS.indexOf(firstOpenStep(definitions, initialAnswers, listeningPlays)),
  );
  const [view, setView] = useState<View>({ kind: "steps" });
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  // Saving works on refs: the latest state, what the server has, and the request in flight.
  const latest = useRef(snapshot);
  const savedKey = useRef(JSON.stringify(snapshot));
  const running = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // A new step takes the focus, so a screen reader announces it.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [stepIndex, view.kind]);

  /**
   * Sends the latest state until the server has it. A call while a request is in flight does not
   * start another one: the running loop picks the newest state up when it comes back. Resolves to
   * false when a request failed.
   */
  function save(): Promise<boolean> {
    if (running.current) return running.current;
    const run: Promise<boolean> = (async () => {
      try {
        while (JSON.stringify(latest.current) !== savedKey.current) {
          const sent = latest.current;
          setSaveState({ kind: "saving" });
          const result = await saveAssessmentAnswers({ assessmentId, answers: sent.answers, listeningPlays: sent.plays });
          if (!result.ok) {
            setSaveState({ kind: "error", message: result.error });
            return false;
          }
          savedKey.current = JSON.stringify(sent);
        }
        setSaveState((state) => (state.kind === "idle" ? state : { kind: "saved" }));
        return true;
      } catch {
        setSaveState({ kind: "error", message: "Vérifie ta connexion." });
        return false;
      }
    })().finally(() => {
      // After the assignment below, even when the loop had nothing to send.
      if (running.current === run) running.current = null;
    });
    running.current = run;
    return run;
  }

  function flush(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    return save();
  }

  function change(next: Partial<Snapshot>, when: "later" | "now") {
    const value = { ...latest.current, ...next };
    latest.current = value;
    setSnapshot(value);
    if (when === "now") {
      void flush();
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }

  const setQuestion = (id: string, text: string) =>
    change({ answers: { ...latest.current.answers, questions: { ...latest.current.answers.questions, [id]: text } } }, "later");
  const setClaim = (id: string, value: boolean) =>
    change({ answers: { ...latest.current.answers, speaking: { ...latest.current.answers.speaking, [id]: value } } }, "now");

  function goTo(index: number) {
    moved.current = true;
    void flush();
    setStepIndex(index);
    setView({ kind: "steps" });
  }

  function showRecap() {
    moved.current = true;
    void flush();
    setView({ kind: "recap" });
  }

  async function finish() {
    setView({ kind: "grading" });
    if (!(await flush())) {
      // The error is shown by the save status; nothing is graded from answers the server does not have.
      setView({ kind: "recap" });
      return;
    }
    const outcome = await gradeAssessment({ assessmentId });
    if (!outcome.ok) {
      setView({ kind: "problem", message: outcome.error, canRetry: true });
      return;
    }
    const result = outcome.data;
    switch (result.status) {
      case "ready":
        // The page now shows the profile; stay on the waiting screen while it loads.
        router.refresh();
        return;
      case "empty":
        setView({
          kind: "problem",
          message: "Il n’y a encore rien à corriger : réponds à au moins une question avant de terminer.",
          canRetry: false,
        });
        return;
      case "limit":
        setView({
          kind: "problem",
          message: "Trop de corrections aujourd’hui, reviens demain : tes réponses sont gardées.",
          canRetry: false,
        });
        return;
      case "unavailable-dossier":
        setView({
          kind: "problem",
          message: "Ce bilan n’est plus disponible pour le moment. Tes réponses sont gardées.",
          canRetry: false,
        });
        return;
      case "unavailable": {
        const left = result.attemptsLeft;
        if (left === 0) {
          setView({
            kind: "problem",
            message: "La correction n’a pas abouti et tu n’as plus d’essai pour ce bilan. Tes réponses sont gardées.",
            canRetry: false,
          });
        } else {
          setView({
            kind: "problem",
            message: `La correction n’a pas abouti. Tes réponses sont gardées${
              left === null ? "." : ` : il te reste ${countLabel(left, "essai", "essais")}.`
            }`,
            canRetry: true,
          });
        }
        return;
      }
    }
  }

  const step: AssessmentStep = ASSESSMENT_STEPS[stepIndex];
  const { answers, plays } = snapshot;

  const saveStatus = (
    <div className="mt-4 space-y-2">
      <p aria-live="polite" className="min-h-4 text-xs text-muted">
        {saveState.kind === "saving" ? "Enregistrement…" : saveState.kind === "saved" ? "Enregistré" : ""}
      </p>
      {saveState.kind === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="min-w-0 flex-1">
            Tes réponses n’ont pas pu être enregistrées ({saveState.message}). Tu peux continuer : elles seront renvoyées à
            la prochaine modification.
          </p>
          <button type="button" onClick={() => void flush()} className="min-h-11 shrink-0 font-semibold underline underline-offset-2">
            Réessayer
          </button>
        </div>
      )}
    </div>
  );

  const header = (
    <div className="mb-6 flex items-center justify-between gap-3 border-b border-line pb-3">
      <LanguageTag language={dossier.language} />
    </div>
  );

  if (view.kind === "grading") {
    return (
      <div>
        {header}
        <section role="status" aria-live="polite" className="max-w-[68ch] border-t border-ink pt-5">
          <Eyebrow>Correction</Eyebrow>
          <h1 ref={headingRef} tabIndex={-1} className="sd-display mt-2 text-3xl outline-none">
            Correction en cours…
          </h1>
          <p className="mt-2 font-serif text-lg leading-relaxed text-ink-soft">
            Ça peut prendre une minute. Garde cette page ouverte : tes réponses sont enregistrées.
          </p>
        </section>
      </div>
    );
  }

  if (view.kind === "problem") {
    return (
      <div className="pb-safe">
        {header}
        <p role="alert" className="max-w-[68ch] rounded-2xl bg-danger-soft px-4 py-3 text-sm leading-relaxed text-danger">
          {view.message}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {view.canRetry && (
            <button type="button" onClick={() => void finish()} className={BUTTON_PRIMARY}>
              Réessayer
            </button>
          )}
          <button type="button" onClick={() => setView({ kind: "recap" })} className={BUTTON_SECONDARY}>
            Revenir à mes réponses
          </button>
        </div>
      </div>
    );
  }

  if (view.kind === "recap") {
    const recap = recapLines(dossier, snapshot, claims);
    const nothing = recap.reading.empty && recap.listening.missing === dossier.listening.questions.length && recap.writing.empty && recap.speaking.empty;
    const lines: { step: AssessmentStep; text: string; warn: boolean }[] = [
      {
        step: "reading",
        warn: recap.reading.empty || recap.reading.missing > 0,
        text: recap.reading.empty
          ? "non évaluée"
          : recap.reading.missing > 0
            ? `${countLabel(recap.reading.missing, "question sans réponse comptera", "questions sans réponse compteront")} comme fausse${recap.reading.missing > 1 ? "s" : ""}`
            : "toutes les questions ont une réponse",
      },
      {
        step: "listening",
        warn: recap.listening.empty || recap.listening.missing > 0,
        text: recap.listening.empty
          ? "non évaluée"
          : recap.listening.missing > 0
            ? `${countLabel(recap.listening.missing, "question sans réponse comptera", "questions sans réponse compteront")} comme fausse${recap.listening.missing > 1 ? "s" : ""}`
            : "toutes les questions ont une réponse",
      },
      {
        step: "writing",
        warn: recap.writing.empty,
        text: recap.writing.empty ? "non évaluée" : "texte écrit",
      },
      {
        step: "speaking",
        warn: recap.speaking.empty || recap.speaking.missing > 0,
        text: recap.speaking.empty
          ? "non évaluée"
          : recap.speaking.missing > 0
            ? `${countLabel(recap.speaking.missing, "affirmation sans réponse comptera", "affirmations sans réponse compteront")} comme « non »`
            : "toutes les affirmations ont une réponse",
      },
    ];
    return (
      <div className="pb-safe">
        {header}
        <Eyebrow>Avant de terminer</Eyebrow>
        <h1 ref={headingRef} tabIndex={-1} className="sd-display mt-2 text-4xl outline-none">
          Récapitulatif
        </h1>
        <p className="mt-2 max-w-[68ch] font-serif text-lg leading-relaxed text-ink-soft">
          Une épreuve laissée vide n’est pas évaluée, sans pénalité. Tu peux revenir sur une étape avant d’envoyer.
        </p>
        <ul className="mt-6 border-t border-ink md:grid md:grid-cols-2 md:gap-x-10">
          {lines.map((line, index) => (
            <li key={line.step}>
              <button
                type="button"
                onClick={() => goTo(index)}
                className="flex min-h-11 w-full items-center gap-4 border-b border-line py-4 text-start transition-colors hover:bg-surface-sunk"
              >
                <span aria-hidden="true" className="w-8 shrink-0 font-serif text-2xl font-extrabold text-accent-strong">
                  {toRoman(index + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-lg font-bold">{SKILL_NAMES[line.step]}</span>
                  <span className={`block text-sm ${line.warn ? "text-ochre" : "text-ink-soft"}`}>{line.text}</span>
                </span>
                <ArrowRightIcon width={14} height={14} className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-[68ch] text-xs leading-relaxed text-muted">
          Tes réponses sont envoyées à Anthropic pour être corrigées. Une fois corrigé, le bilan ne peut plus être modifié.
        </p>
        {saveStatus}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => void finish()} disabled={nothing} className={BUTTON_PRIMARY}>
            Terminer
          </button>
          <button type="button" onClick={() => goTo(ASSESSMENT_STEPS.length - 1)} className={BUTTON_SECONDARY}>
            Revenir aux réponses
          </button>
        </div>
        {nothing && <p className="mt-3 text-sm text-ink-soft">Tu n’as encore rien répondu : il n’y a rien à corriger.</p>}
      </div>
    );
  }

  const isLast = stepIndex === ASSESSMENT_STEPS.length - 1;
  return (
    <div className="pb-safe">
      {header}
      <div className="mb-5">
        <Eyebrow>
          Étape {stepIndex + 1} sur {ASSESSMENT_STEPS.length}
        </Eyebrow>
        <ProgressBar value={stepIndex / ASSESSMENT_STEPS.length} label="Progression du bilan" className="mt-2" />
      </div>
      <div className="flex items-baseline gap-4 border-t border-ink pt-5">
        <span aria-hidden="true" className="font-serif text-4xl font-extrabold text-accent-strong">
          {toRoman(stepIndex + 1)}
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="sd-display text-3xl outline-none sm:text-4xl">
          {SKILL_NAMES[step]}
        </h1>
      </div>

      {step === "reading" && (
        <section className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-0">
          <article className="lg:pr-10">
            <h2 lang={info.code} dir={info.dir} className="font-serif text-2xl font-bold italic">
              {dossier.title}
            </h2>
            <p lang={info.code} dir={info.dir} className="mt-3 max-w-[68ch] font-serif text-lg leading-relaxed whitespace-pre-line">
              {dossier.reading.text}
            </p>
          </article>
          <div className="space-y-5 lg:border-l lg:border-line lg:pl-10">
            <p id={hintId} className="text-sm leading-relaxed text-ink-soft">
              Réponds en français ou dans la langue, au choix : seul le sens compte.
            </p>
            {dossier.reading.questions.map((q) => (
            <AnswerField
              key={q.id}
              label={q.prompt}
              value={answers.questions[q.id] ?? ""}
              max={ASSESSMENT_ANSWER_MAX}
              hintId={hintId}
              lang={info.code}
              onChange={(text) => setQuestion(q.id, text)}
              onBlur={() => void flush()}
            />
          ))}
          </div>
        </section>
      )}

      {step === "listening" && (
        <section className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-0">
          <div className="lg:pr-10">
            {dossier.listening.video ? (
              <YouTubeListeningPlayer
                video={dossier.listening.video}
                title="Regarde et écoute le passage"
                initialPlays={plays}
                onPlaysChange={(n) => change({ plays: n }, "now")}
              />
            ) : dossier.listening.audioSrc ? (
              <ListeningPlayer
                src={dossier.listening.audioSrc}
                title="Écoute le passage"
                initialPlays={plays}
                onPlaysChange={(n) => change({ plays: n }, "now")}
              />
            ) : dossier.listening.draftScript ? (
              <DraftScript script={dossier.listening.draftScript} />
            ) : (
              <p role="note" className="text-sm text-ink-soft">
                L’enregistrement n’est pas disponible pour le moment. Tu peux passer cette étape.
              </p>
            )}
            {(dossier.listening.audioSrc || dossier.listening.video) && (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Tu peux écouter le passage {LISTENING_MAX_PLAYS} fois au plus, puis répondre aux questions.
              </p>
            )}
          </div>
          <div className="space-y-5 lg:border-l lg:border-line lg:pl-10">
            <p id={hintId} className="text-sm leading-relaxed text-ink-soft">
              Réponds en français ou dans la langue, au choix : seul le sens compte.
            </p>
            {dossier.listening.questions.map((q) => (
            <AnswerField
              key={q.id}
              label={q.prompt}
              value={answers.questions[q.id] ?? ""}
              max={ASSESSMENT_ANSWER_MAX}
              hintId={hintId}
              lang={info.code}
              onChange={(text) => setQuestion(q.id, text)}
              onBlur={() => void flush()}
            />
          ))}
          </div>
        </section>
      )}

      {step === "writing" && (
        <section className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-0">
          <div className="lg:pr-10">
            <Eyebrow>Consigne</Eyebrow>
            <p className="mt-2 max-w-[68ch] font-serif text-xl leading-relaxed">{dossier.writing.prompt}</p>
            <p className="mt-2 text-sm text-ink-soft">Environ {dossier.writing.sentences} phrases.</p>
          </div>
          <div className="lg:border-l lg:border-line lg:pl-10">
            <p id={hintId} className="sr-only">
              Écris dans la langue étudiée.
            </p>
            <AnswerField
            label="Ton texte"
            value={answers.writing}
            max={ASSESSMENT_WRITING_MAX}
            rows={8}
            hintId={hintId}
            lang={info.code}
            onChange={(text) => change({ answers: { ...latest.current.answers, writing: text } }, "later")}
            onBlur={() => void flush()}
          />
          </div>
        </section>
      )}

      {step === "speaking" && (
        <section className="mt-6">
          <p id={hintId} className="max-w-[68ch] border-y border-dashed border-line py-3 text-sm leading-relaxed text-ink-soft">
            Ce que tu déclares ici ne sera pas vérifié : réponds honnêtement, c’est pour toi. Une affirmation laissée sans
            réponse compte comme « non ».
          </p>
          <div className="mt-2 md:grid md:grid-cols-2 md:gap-x-10">
          {claims.map((claim) => {
            const value = answers.speaking[claim.id];
            return (
              <fieldset key={claim.id} aria-describedby={hintId} className="border-b border-line py-4">
                <legend className="sr-only">{claim.text}</legend>
                <p aria-hidden="true" className="font-serif text-lg leading-snug">
                  {claim.text}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: "Oui", checked: value === true, set: true },
                    { label: "Non", checked: value === false, set: false },
                  ].map((option) => (
                    <label
                      key={option.label}
                      className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line text-sm font-semibold has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
                    >
                      <input
                        type="radio"
                        name={claim.id}
                        checked={option.checked}
                        onChange={() => setClaim(claim.id, option.set)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
          </div>
        </section>
      )}

      {saveStatus}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {stepIndex > 0 && (
          <button type="button" onClick={() => goTo(stepIndex - 1)} className={BUTTON_SECONDARY}>
            Précédent
          </button>
        )}
        {isLast ? (
          <button type="button" onClick={showRecap} className={BUTTON_PRIMARY}>
            Voir le récapitulatif
            <ArrowRightIcon width={14} height={14} />
          </button>
        ) : (
          <button type="button" onClick={() => goTo(stepIndex + 1)} className={BUTTON_PRIMARY}>
            Suivant
            <ArrowRightIcon width={14} height={14} />
          </button>
        )}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Tu peux quitter à tout moment : tes réponses sont enregistrées et tu reprendras là où tu t’es arrêté.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { recordAlphabetCheck } from "@/app/actions/alphabet";
import { optionsInLanguage, Question } from "@/components/alphabet/alphabet-practice";
import { languageStyle } from "@/components/ui/language-style";
import { buttonClass, Columns, Eyebrow, ProgressBar } from "@/components/ui/primitives";
import { ALPHABET_CHECK_PASS, ALPHABET_SCRIPT_NAMES, gradeAlphabetCheck } from "@/lib/domain/alphabet";
import { languageInfo } from "@/lib/domain/languages";
import type { AlphabetExercise, AlphabetScript } from "@/lib/schemas/alphabet";
import type { DateKey, Language } from "@/lib/schemas/common";

type Phase = "intro" | "questions" | "result";

interface Outcome {
  correct: number;
  total: number;
  passed: boolean;
  /** True once the server has answered (or there is nothing to save). */
  settled: boolean;
  error: string | null;
}

/**
 * The reading check of an alphabet: one word to read at a time, no verdict until the end. The
 * answers go to the server (`persist`), which rebuilds the check from `day`, grades it and, on a
 * pass, marks every group as known.
 */
export function AlphabetCheck({
  exercises,
  day,
  language,
  script,
  firstGroupId,
  persist,
}: {
  exercises: AlphabetExercise[];
  /** The day the check was drawn: the server rebuilds the same questions from it. */
  day: DateKey;
  language: Language;
  script: AlphabetScript;
  /** Where to start when the check is failed. */
  firstGroupId: string;
  persist: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<(number | null)[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const style = languageStyle(language);
  const scriptName = ALPHABET_SCRIPT_NAMES[script];

  async function answer(choice: number | null) {
    const next = [...choices, choice];
    setChoices(next);
    if (index < exercises.length - 1) {
      setIndex(index + 1);
      return;
    }
    setPhase("result");
    const local = gradeAlphabetCheck(exercises, next);
    if (!persist) {
      setOutcome({ ...local, settled: true, error: null });
      return;
    }
    setOutcome({ ...local, settled: false, error: null });
    const result = await recordAlphabetCheck({ language, day, choices: next });
    setOutcome(
      result.ok
        ? { correct: result.data.correct, total: result.data.total, passed: result.data.passed, settled: true, error: null }
        : { ...local, passed: false, settled: true, error: result.error },
    );
  }

  function restart() {
    setIndex(0);
    setChoices([]);
    setOutcome(null);
    setPhase("intro");
  }

  if (phase === "intro") {
    return (
      <Columns
        main={
          <section className="max-w-[68ch]">
            <Eyebrow>Test de lecture</Eyebrow>
            <h1 className="sd-display mt-2 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02]">Tu lis déjà {scriptName} ?</h1>
            <p className="mt-4 font-serif text-xl leading-relaxed text-ink-soft">
              {exercises.length} mots à lire, il en faut {Math.ceil(exercises.length * ALPHABET_CHECK_PASS)} justes pour passer
              directement aux révisions.
            </p>
          </section>
        }
        aside={
          <div className="space-y-3 border-t border-ink pt-5 lg:border-t-0 lg:pt-0">
            <button type="button" onClick={() => setPhase("questions")} className={`${buttonClass.primary} w-full`}>
              Commencer le test
            </button>
            <Link href={`/alphabet?langue=${language}`} className={`${buttonClass.quiet} w-full`}>
              Retour à l’alphabet
            </Link>
          </div>
        }
      />
    );
  }

  if (phase === "result" && outcome) {
    const saving = persist && !outcome.settled;
    const done = outcome.settled && !outcome.error;
    return (
      <Columns
        main={
          <section>
            <Eyebrow>Ton score</Eyebrow>
            <p className={`sd-stamp sd-display mt-3 inline-block border-4 border-accent-strong px-6 py-2 text-6xl leading-none ${style.text}`}>
              {outcome.correct} / {outcome.total}
            </p>
            <div aria-live="polite" className="mt-5 max-w-[68ch] space-y-3 font-serif text-xl leading-relaxed text-ink-soft">
              {saving && <p>Enregistrement…</p>}
              {outcome.error && (
                <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 font-sans text-sm text-danger">
                  {outcome.error}
                </p>
              )}
              {done && !persist && <p>Mode démonstration : rien n’est enregistré.</p>}
              {done && persist && outcome.passed && <p>Alphabet validé : tous les groupes sont marqués comme maîtrisés.</p>}
              {done && !outcome.passed && <p>Pas encore : commence par le premier groupe, quelques lettres à la fois.</p>}
            </div>
          </section>
        }
        aside={
          <div className="space-y-3 border-t border-ink pt-5 lg:border-t-0 lg:pt-0">
            {done && (
              <Link
                href={outcome.passed ? `/alphabet?langue=${language}` : `/alphabet/${language}/${firstGroupId}`}
                className={`${buttonClass.primary} w-full`}
              >
                {outcome.passed ? "Voir mon alphabet" : "Commencer par le premier groupe"}
              </Link>
            )}
            <button type="button" onClick={restart} disabled={saving} className={`${buttonClass.quiet} w-full`}>
              Recommencer
            </button>
          </div>
        }
      />
    );
  }

  const exercise = exercises[index];
  const inLanguage = optionsInLanguage(exercise);
  return (
    <section>
      <div className="flex items-center justify-between">
        <Eyebrow>Test de lecture</Eyebrow>
        <span className="text-xs font-medium text-muted">
          {index + 1} / {exercises.length}
        </span>
      </div>
      <ProgressBar value={index / exercises.length} label="Progression du test" className="mt-3" />

      <div className="mt-6 grid gap-8 border-t border-ink pt-6 lg:grid-cols-2 lg:gap-0">
        <div className="lg:pr-10">
          <Question exercise={exercise} language={language} />
        </div>

        <div className="lg:border-l lg:border-line lg:pl-10">
          <div role="group" aria-label="Choisis la bonne réponse" className="grid grid-cols-2 gap-2">
            {exercise.options.map((option, i) => (
              <button
                key={`${index}-${option}`}
                type="button"
                onClick={() => answer(i)}
                lang={inLanguage ? language : undefined}
                dir={inLanguage ? languageInfo(language).dir : undefined}
                className="min-h-14 rounded-xl border border-line px-3 py-3 text-center font-serif text-xl hover:border-ink hover:bg-surface-sunk"
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => answer(null)}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-ink"
          >
            Je ne sais pas
          </button>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { recordAlphabetCheck } from "@/app/actions/alphabet";
import { optionsInLanguage, Question } from "@/components/alphabet/alphabet-practice";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, ProgressBar } from "@/components/ui/primitives";
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

const BUTTON = "min-h-12 w-full rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition-transform active:scale-[0.98]";

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
      <Card>
        <Eyebrow>Test de lecture</Eyebrow>
        <h1 className="mt-2 font-serif text-2xl font-semibold">Tu lis déjà {scriptName} ?</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          {exercises.length} mots à lire, il en faut {Math.ceil(exercises.length * ALPHABET_CHECK_PASS)} justes pour passer
          directement aux révisions.
        </p>
        <button type="button" onClick={() => setPhase("questions")} className={`${BUTTON} mt-5 bg-ink text-paper`}>
          Commencer le test
        </button>
        <Link
          href={`/alphabet?langue=${language}`}
          className="mt-2 flex min-h-11 items-center justify-center text-sm font-medium text-muted hover:text-ink"
        >
          Retour à l’alphabet
        </Link>
      </Card>
    );
  }

  if (phase === "result" && outcome) {
    const saving = persist && !outcome.settled;
    const done = outcome.settled && !outcome.error;
    return (
      <Card className="text-center">
        <Eyebrow>Ton score</Eyebrow>
        <p className={`mt-2 font-serif text-5xl font-semibold ${style.text}`}>
          {outcome.correct} / {outcome.total}
        </p>
        <div aria-live="polite" className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">
          {saving && <p>Enregistrement…</p>}
          {outcome.error && (
            <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {outcome.error}
            </p>
          )}
          {done && !persist && <p>Mode démonstration : rien n’est enregistré.</p>}
          {done && persist && outcome.passed && <p>Alphabet validé : tous les groupes sont marqués comme maîtrisés.</p>}
          {done && !outcome.passed && <p>Pas encore : commence par le premier groupe, quelques lettres à la fois.</p>}
        </div>
        {done && (
          <Link
            href={outcome.passed ? `/alphabet?langue=${language}` : `/alphabet/${language}/${firstGroupId}`}
            className={`${BUTTON} mt-5 flex items-center justify-center bg-ink text-paper`}
          >
            {outcome.passed ? "Voir mon alphabet" : "Commencer par le premier groupe"}
          </Link>
        )}
        <button
          type="button"
          onClick={restart}
          disabled={saving}
          className="mt-2 min-h-11 w-full text-sm font-medium text-muted hover:text-ink disabled:opacity-60"
        >
          Recommencer
        </button>
      </Card>
    );
  }

  const exercise = exercises[index];
  const inLanguage = optionsInLanguage(exercise);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Test de lecture</Eyebrow>
        <span className="text-xs font-medium text-muted">
          {index + 1} / {exercises.length}
        </span>
      </div>
      <ProgressBar value={index / exercises.length} label="Progression du test" className="mt-3" />

      <div className="pt-5">
        <Question exercise={exercise} language={language} />

        <div role="group" aria-label="Choisis la bonne réponse" className="mt-4 grid grid-cols-2 gap-2">
          {exercise.options.map((option, i) => (
            <button
              key={`${index}-${option}`}
              type="button"
              onClick={() => answer(i)}
              lang={inLanguage ? language : undefined}
              dir={inLanguage ? languageInfo(language).dir : undefined}
              className="min-h-14 rounded-2xl border border-line px-3 py-3 text-center font-serif text-xl hover:bg-surface-sunk"
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => answer(null)}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-muted hover:text-ink"
        >
          Je ne sais pas
        </button>
      </div>
    </Card>
  );
}

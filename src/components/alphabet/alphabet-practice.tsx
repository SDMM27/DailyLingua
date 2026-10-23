"use client";

import { useState } from "react";
import { recordAlphabetPractice } from "@/app/actions/alphabet";
import { languageStyle } from "@/components/ui/language-style";
import { ListenButton, useHasLocalVoice } from "@/components/ui/listen-button";
import { Card, Eyebrow, ProgressBar } from "@/components/ui/primitives";
import { GRAMMAR_PASS_RATIO, type GrammarPracticeOutcome } from "@/lib/domain/grammar";
import { languageInfo } from "@/lib/domain/languages";
import { relativeDueLabel } from "@/lib/domain/spaced-repetition";
import { letterLabel } from "@/lib/domain/alphabet";
import { stripStress } from "@/lib/domain/stress";
import type { AlphabetCard, AlphabetExercise } from "@/lib/schemas/alphabet";
import type { DateKey, Language } from "@/lib/schemas/common";

interface Finish {
  correct: number;
  total: number;
  /** Null while saving, in the demo, or when the save failed. */
  outcome: GrammarPracticeOutcome | null;
  card: AlphabetCard | null;
  error: string | null;
}

function finishMessage(finish: Finish, today: DateKey, persist: boolean): string | null {
  if (!persist) return "Mode démonstration : rien n’est enregistré.";
  const { outcome, card } = finish;
  const label = card ? relativeDueLabel(card.review.dueOn, today) : "";
  switch (outcome) {
    case "created":
      return `Groupe ajouté à tes révisions : prochaine révision ${label}.`;
    case "reviewed":
      return `Prochaine révision ${label}.`;
    case "practice":
      return card?.status === "known"
        ? "Entraînement libre : ce groupe est maîtrisé."
        : `Entraînement libre : ta prochaine révision reste ${label}.`;
    case "not-passed":
      return `Il faut au moins ${Math.round(GRAMMAR_PASS_RATIO * 100)} % de bonnes réponses pour l’ajouter à tes révisions. Encore un essai ?`;
    default:
      return null;
  }
}

/** Whether an option is written in the studied language (letters, words) rather than Latin. */
export function optionsInLanguage(exercise: AlphabetExercise): boolean {
  return exercise.type === "latin-to-letter" || exercise.type === "listen-word";
}

/**
 * The generated questions of one group of letters, one at a time; an option is answered as soon
 * as it is tapped. At the end the score is sent to the server (`persist`), which creates the
 * review card, reviews it or records nothing. Listening questions need a voice on the device:
 * without one they are dropped (the list is fixed once the first answer is given).
 */
export function AlphabetPractice({
  groupId,
  exercises,
  language,
  card: initialCard,
  today,
  persist,
}: {
  groupId: string;
  exercises: AlphabetExercise[];
  language: Language;
  card?: AlphabetCard;
  today: DateKey;
  persist: boolean;
}) {
  const hasVoice = useHasLocalVoice(language);
  const [frozen, setFrozen] = useState<AlphabetExercise[] | null>(null);
  const [card, setCard] = useState(initialCard);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finish, setFinish] = useState<Finish | null>(null);
  const style = languageStyle(language);
  const dir = languageInfo(language).dir;

  const questions = frozen ?? (hasVoice ? exercises : exercises.filter((e) => e.type !== "listen-word"));
  const exercise = questions[index];
  const isLast = index === questions.length - 1;
  const answered = choice !== null;

  function choose(option: number) {
    if (answered) return;
    if (!frozen) setFrozen(questions);
    setChoice(option);
    setResults((r) => [...r, option === exercise.answer]);
  }

  async function next() {
    if (!isLast) {
      setIndex((i) => i + 1);
      setChoice(null);
      return;
    }
    const correct = results.filter(Boolean).length;
    const total = questions.length;
    setFinish({ correct, total, outcome: null, card: null, error: null });
    if (!persist) return;
    const result = await recordAlphabetPractice({
      groupId,
      correct,
      total,
      expectedReviewCount: card?.review.reviewCount ?? null,
    });
    if (result.ok) {
      if (result.data.card) setCard(result.data.card);
      setFinish({ correct, total, ...result.data, error: null });
    } else {
      setFinish({ correct, total, outcome: null, card: null, error: result.error });
    }
  }

  function restart() {
    setFrozen(null);
    setIndex(0);
    setChoice(null);
    setResults([]);
    setFinish(null);
  }

  if (finish) {
    const message = finishMessage(finish, today, persist);
    const saving = persist && finish.outcome === null && finish.error === null;
    return (
      <Card className="text-center">
        <Eyebrow>Ton score</Eyebrow>
        <p className={`mt-2 font-serif text-5xl font-semibold ${style.text}`}>
          {finish.correct} / {finish.total}
        </p>
        <div aria-live="polite" className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {saving ? "Enregistrement…" : message}
          {finish.error && (
            <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {finish.error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={restart}
          disabled={saving}
          className="mt-5 min-h-12 w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          Recommencer
        </button>
      </Card>
    );
  }

  const inLanguage = optionsInLanguage(exercise);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Exercices</Eyebrow>
        <span className="text-xs font-medium text-muted">
          {index + 1} / {questions.length}
        </span>
      </div>
      <ProgressBar value={index / questions.length} label="Progression des exercices" className="mt-3" />

      <div className="pt-5">
        <Question exercise={exercise} language={language} />

        <div role="group" aria-label="Choisis la bonne réponse" className="mt-4 grid grid-cols-2 gap-2">
          {exercise.options.map((option, i) => {
            const selected = choice === i;
            const tone = answered
              ? i === exercise.answer
                ? "border-success bg-success-soft"
                : selected
                  ? "border-danger bg-danger-soft"
                  : "border-line"
              : "border-line hover:bg-surface-sunk";
            return (
              <button
                key={option}
                type="button"
                lang={inLanguage ? language : undefined}
                dir={inLanguage ? dir : undefined}
                disabled={answered}
                onClick={() => choose(i)}
                className={`min-h-14 rounded-2xl border px-3 py-3 text-center font-serif text-xl ${tone}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div aria-live="polite">
          {answered && (
            <div className="mt-4 space-y-1">
              <p className={`font-semibold ${choice === exercise.answer ? "text-success" : "text-danger"}`}>
                {choice === exercise.answer ? "Juste !" : "Pas tout à fait."}
              </p>
              {choice !== exercise.answer && (
                <p className="text-[15px]">
                  Bonne réponse :{" "}
                  <span lang={inLanguage ? language : undefined} dir={inLanguage ? dir : undefined} className="font-serif font-semibold">
                    {exercise.options[exercise.answer]}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {answered && (
          <button
            type="button"
            onClick={next}
            className="mt-5 min-h-12 w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]"
          >
            {isLast ? "Voir mon score" : "Suivant"}
          </button>
        )}
      </div>
    </Card>
  );
}

export function Question({ exercise, language }: { exercise: AlphabetExercise; language: Language }) {
  const dir = languageInfo(language).dir;
  switch (exercise.type) {
    case "letter-to-latin":
      return (
        <>
          <p className="text-[15px] text-ink-soft">Comment se transcrit cette lettre ?</p>
          <p lang={language} dir={dir} className="mt-2 font-serif text-6xl font-semibold">
            {letterLabel(exercise)}
          </p>
        </>
      );
    case "latin-to-letter":
      return (
        <>
          <p className="text-[15px] text-ink-soft">Quelle lettre se transcrit comme ci-dessous ?</p>
          <p className="mt-2 font-serif text-5xl font-semibold">{exercise.latin}</p>
          <p className="mt-1 text-sm text-muted">{exercise.soundFr}</p>
        </>
      );
    case "read-word":
      return (
        <>
          <p className="text-[15px] text-ink-soft">Comment se lit ce mot, lettre par lettre ?</p>
          <p lang={language} dir={dir} className="mt-2 font-serif text-4xl font-semibold">
            {exercise.word}
          </p>
        </>
      );
    case "listen-word":
      return (
        <>
          <p className="text-[15px] text-ink-soft">Écoute, puis choisis le mot écrit.</p>
          <div className="mt-3 flex">
            <ListenButton text={stripStress(exercise.word)} language={language} />
          </div>
        </>
      );
  }
}

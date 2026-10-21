"use client";

import { Fragment, useState } from "react";
import { deleteGrammarCard, recordGrammarPractice } from "@/app/actions/grammar";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, ProgressBar } from "@/components/ui/primitives";
import { exerciseCorrection, GRAMMAR_PASS_RATIO, isExerciseAnswerCorrect, type GrammarPracticeOutcome } from "@/lib/domain/grammar";
import { relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { DateKey, Language } from "@/lib/schemas/common";
import { GRAMMAR_GAP, type GrammarCard, type GrammarPoint } from "@/lib/schemas/grammar";

/** The prompt of a `choose` or `fill` exercise, its gap drawn as a visible blank. */
function Prompt({ text, hint }: { text: string; hint?: string }) {
  const parts = text.split(GRAMMAR_GAP);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <>
              <span
                role="img"
                aria-label="blanc à compléter"
                className="mx-1 inline-block w-14 border-b-2 border-ink align-baseline"
              />
              {hint && <span className="text-base text-muted">({hint})</span>}
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}

interface Finish {
  correct: number;
  total: number;
  /** Null while saving, in the demo, or when the save failed. */
  outcome: GrammarPracticeOutcome | null;
  card: GrammarCard | null;
  error: string | null;
}

function finishMessage(finish: Finish, today: DateKey, persist: boolean): string | null {
  if (!persist) return "Mode démonstration : rien n’est enregistré.";
  const { outcome, card } = finish;
  const label = card ? relativeDueLabel(card.review.dueOn, today) : "";
  switch (outcome) {
    case "created":
      return `Fiche ajoutée à tes révisions : prochaine révision ${label}.`;
    case "reviewed":
      return `Prochaine révision ${label}.`;
    case "practice":
      return card?.status === "known"
        ? "Entraînement libre : cette fiche est maîtrisée."
        : `Entraînement libre : ta prochaine révision reste ${label}.`;
    case "not-passed":
      return `Il faut au moins ${Math.round(GRAMMAR_PASS_RATIO * 100)} % de bonnes réponses pour l’ajouter à tes révisions. Encore un essai ?`;
    default:
      return null;
  }
}

/**
 * The exercises of one grammar point, one at a time. At the end the score is sent to the server
 * (`persist`), which creates the review card, reviews it or records nothing; the message tells
 * which. `persist` is false in the demo, where nothing can be saved.
 */
export function GrammarPractice({
  point,
  language,
  card: initialCard,
  today,
  persist,
}: {
  point: GrammarPoint;
  language: Language;
  card?: GrammarCard;
  today: DateKey;
  persist: boolean;
}) {
  const { exercises } = point;
  const [card, setCard] = useState(initialCard);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const style = languageStyle(language);

  const exercise = exercises[index];
  const isLast = index === exercises.length - 1;
  const answer = exercise?.type === "choose" ? choice : text;
  const canCheck = checked === null && (exercise?.type === "choose" ? choice !== null : text.trim() !== "");

  function check() {
    if (!canCheck || answer === null) return;
    const correct = isExerciseAnswerCorrect(exercise, answer, language);
    setChecked(correct);
    setResults((r) => [...r, correct]);
  }

  async function next() {
    if (!isLast) {
      setIndex((i) => i + 1);
      setChoice(null);
      setText("");
      setChecked(null);
      return;
    }
    const correct = results.filter(Boolean).length;
    const total = exercises.length;
    setFinish({ correct, total, outcome: null, card: null, error: null });
    if (!persist) return;
    const result = await recordGrammarPractice({
      pointId: point.id,
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
    setIndex(0);
    setChoice(null);
    setText("");
    setChecked(null);
    setResults([]);
    setFinish(null);
  }

  async function remove() {
    if (!card) return;
    const result = await deleteGrammarCard({ id: card.id });
    if (result.ok) {
      setCard(undefined);
      setRemoveError(null);
    } else {
      setRemoveError(result.error);
    }
  }

  const removeLink = card && persist && (
    <div className="mt-4 text-center">
      <button type="button" onClick={remove} className="min-h-11 text-xs font-medium text-muted hover:text-danger">
        Retirer de mes révisions
      </button>
      {removeError && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {removeError}
        </p>
      )}
    </div>
  );

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
          className="mt-5 w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          Recommencer
        </button>
        {removeLink}
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Exercices</Eyebrow>
        <span className="text-xs font-medium text-muted">
          {index + 1} / {exercises.length}
        </span>
      </div>
      <ProgressBar value={index / exercises.length} label="Progression des exercices" className="mt-3" />

      <form
        className="pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (checked === null) check();
        }}
      >
        {exercise.type === "transform" ? (
          <>
            <p className="text-[15px] text-ink-soft">{exercise.instruction}</p>
            <p lang={language} className="mt-2 font-serif text-2xl font-semibold text-balance">
              {exercise.source}
            </p>
          </>
        ) : (
          <p lang={language} className="font-serif text-2xl font-semibold text-balance">
            <Prompt text={exercise.prompt} hint={exercise.type === "fill" ? exercise.hint : undefined} />
          </p>
        )}

        {exercise.type === "choose" ? (
          <div role="group" aria-label="Choisis la bonne forme" className="mt-4 grid gap-2">
            {exercise.options.map((option, i) => {
              const selected = choice === i;
              const reveal = checked !== null;
              const tone = reveal
                ? i === exercise.answer
                  ? "border-success bg-success-soft"
                  : selected
                    ? "border-danger bg-danger-soft"
                    : "border-line"
                : selected
                  ? "border-ink bg-surface-sunk"
                  : "border-line hover:bg-surface-sunk";
              return (
                <button
                  key={option}
                  type="button"
                  lang={language}
                  aria-pressed={selected}
                  disabled={reveal}
                  onClick={() => setChoice(i)}
                  className={`min-h-12 rounded-2xl border px-4 py-3 text-left font-serif text-lg ${tone}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="mt-4 block">
            <span className="sr-only">Ta réponse</span>
            <input
              type="text"
              lang={language}
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={checked !== null}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ta réponse"
              className="block w-full rounded-2xl border border-line bg-paper px-4 py-3 font-serif text-base"
            />
          </label>
        )}

        <div aria-live="polite">
          {checked !== null && (
            <div className="mt-4 space-y-2">
              <p className={`font-semibold ${checked ? "text-success" : "text-danger"}`}>
                {checked ? "Juste !" : "Pas tout à fait."}
              </p>
              {!checked && (
                <p className="text-[15px]">
                  Bonne réponse :{" "}
                  <span lang={language} className="font-serif font-semibold">
                    {exerciseCorrection(exercise)}
                  </span>
                </p>
              )}
              <p className="text-[13px] leading-relaxed text-ink-soft">{exercise.explanation}</p>
            </div>
          )}
        </div>

        <div className="mt-5">
          {checked === null ? (
            <button
              type="submit"
              disabled={!canCheck}
              className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              Vérifier
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]"
            >
              {isLast ? "Voir mon score" : "Suivant"}
            </button>
          )}
        </div>
      </form>
      {removeLink}
    </Card>
  );
}

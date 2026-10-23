"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ListenButton, useHasLocalVoice } from "@/components/ui/listen-button";
import { Card, Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { REVIEW_MODE_LABELS } from "@/lib/domain/labels";
import {
  checkTypedAnswer,
  chooseReviewMode,
  clozeSentence,
  gradeForCheck,
  REVIEW_MODES,
  type TypedCheck,
} from "@/lib/domain/review-modes";
import { applyReview, relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { DateKey } from "@/lib/schemas/common";
import type { ReviewGrade, ReviewMode, VocabularyItem, VocabularyList } from "@/lib/schemas/vocabulary";

const GRADES: { grade: ReviewGrade; label: string; tone: string }[] = [
  { grade: "again", label: "À revoir", tone: "border-danger/40 text-danger" },
  { grade: "hard", label: "Difficile", tone: "border-line text-ink-soft" },
  { grade: "good", label: "Bien", tone: "border-line text-ink" },
  { grade: "easy", label: "Facile", tone: "border-success/40 text-success" },
];

type ModeChoice = ReviewMode | "mixed";

const PRIMARY_BUTTON =
  "w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]";

const FEEDBACK: Record<TypedCheck, { text: string; tone: string }> = {
  right: { text: "Juste.", tone: "text-success" },
  close: { text: "Presque : à un accent ou une lettre près.", tone: "text-ink" },
  wrong: { text: "Ce n’est pas ça.", tone: "text-danger" },
};

/**
 * Review of the words due today, in the mode chosen for the session or, by default, a mix that
 * depends on each word's box. `queue` is fixed when the session starts.
 */
export function ReviewSession({
  queue,
  lists,
  today,
  onReviewed,
}: {
  queue: VocabularyItem[];
  lists: VocabularyList[];
  today: DateKey;
  onReviewed: (item: VocabularyItem, grade: ReviewGrade, mode: ReviewMode) => void;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<ModeChoice>("mixed");

  if (queue.length === 0) {
    return (
      <Card>
        <Eyebrow>Révisions du jour</Eyebrow>
        <p className="mt-2 font-serif text-lg">Aucun mot à revoir aujourd’hui.</p>
      </Card>
    );
  }

  if (index >= queue.length) {
    return (
      <Card className="text-center">
        <Eyebrow>Révisions du jour</Eyebrow>
        <p className="mt-2 font-serif text-xl font-semibold">Terminé : {queue.length} mots revus</p>
        <p className="mt-1 text-sm text-ink-soft">Les prochaines dates sont visibles dans la liste.</p>
      </Card>
    );
  }

  const item = queue[index];
  const listName = lists.find((list) => list.id === item.listId)?.name;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Révisions du jour</Eyebrow>
        <span className="text-xs font-medium text-muted">
          {index + 1} / {queue.length}
        </span>
      </div>
      <ProgressBar value={index / queue.length} label="Progression des révisions" className="mt-3" />

      <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
        <span className="shrink-0">Mode</span>
        <select
          value={choice}
          onChange={(event) => setChoice(event.target.value as ModeChoice)}
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-3 text-base text-ink"
        >
          <option value="mixed">Mélangé</option>
          {REVIEW_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {REVIEW_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>

      <ReviewCard
        key={`${index}:${item.id}`}
        item={item}
        listName={listName}
        today={today}
        fixed={choice === "mixed" ? undefined : choice}
        onGrade={(grade, mode) => {
          onReviewed(item, grade, mode);
          setIndex((i) => i + 1);
        }}
      />
    </Card>
  );
}

function ReviewCard({
  item,
  listName,
  today,
  fixed,
  onGrade,
}: {
  item: VocabularyItem;
  listName: string | undefined;
  today: DateKey;
  fixed: ReviewMode | undefined;
  onGrade: (grade: ReviewGrade, mode: ReviewMode) => void;
}) {
  const canListen = useHasLocalVoice(item.language);
  // Voices load asynchronously: once the learner starts answering, the mode no longer changes.
  const [frozen, setFrozen] = useState<ReviewMode | null>(null);
  const mode = frozen ?? chooseReviewMode(item, today, { canListen, fixed });
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<TypedCheck | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result) continueRef.current?.focus();
  }, [result]);

  const freeze = () => setFrozen(mode);
  const cloze = mode === "cloze" ? clozeSentence(item) : null;

  const check = (event: FormEvent) => {
    event.preventDefault();
    if (result) return;
    freeze();
    setResult(checkTypedAnswer(mode, item, answer));
  };

  return (
    <>
      <div className="flex min-h-44 flex-col items-center justify-center py-6 text-center">
        <LanguageTag language={item.language} />
        {listName && <p className="mt-1.5 text-xs text-muted">Liste : {listName}</p>}

        {mode === "flip" || mode === "translate" ? (
          <p lang={item.language} className="mt-4 font-serif text-3xl font-semibold text-balance">
            {item.term}
          </p>
        ) : mode === "produce" ? (
          <p className="mt-4 font-serif text-3xl font-semibold text-balance">{item.translation}</p>
        ) : mode === "listen" ? (
          <div className="mt-4">
            <ListenButton text={item.term} language={item.language} />
          </div>
        ) : (
          cloze && (
            <>
              <p lang={item.language} className="mt-4 font-serif text-2xl font-semibold text-balance">
                {cloze.before}＿＿＿{cloze.after}
              </p>
              <p className="mt-2 text-sm text-ink-soft">Indice : {item.translation}</p>
            </>
          )
        )}

        {mode === "flip" && revealed && (
          <div className="mt-4 space-y-1.5" aria-live="polite">
            <Details item={item} showTranslation />
          </div>
        )}
        {mode !== "flip" && result && (
          <div className="mt-4 space-y-1.5" aria-live="polite">
            <p className={`font-semibold ${FEEDBACK[result].tone}`}>{FEEDBACK[result].text}</p>
            <p lang={mode === "translate" ? "fr" : item.language} className="text-lg">
              {mode === "translate" ? item.translation : item.term}
            </p>
            <Details item={item} showTranslation={mode !== "translate" && mode !== "produce"} />
          </div>
        )}
      </div>

      {mode === "flip" ? (
        revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ grade: g, label, tone }) => (
              <button
                key={g}
                type="button"
                onClick={() => onGrade(g, mode)}
                className={`flex flex-col items-center rounded-2xl border bg-surface px-1 py-2.5 transition-colors hover:bg-surface-sunk ${tone}`}
              >
                <span className="text-[13px] font-semibold">{label}</span>
                <span className="text-[10px] text-muted">
                  {relativeDueLabel(applyReview(item.review, g, today).dueOn, today)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              freeze();
              setRevealed(true);
            }}
            className={PRIMARY_BUTTON}
          >
            Afficher la réponse
          </button>
        )
      ) : result ? (
        <div className="space-y-2">
          <button
            ref={continueRef}
            type="button"
            onClick={() => onGrade(gradeForCheck(result), mode)}
            className={PRIMARY_BUTTON}
          >
            Continuer
          </button>
          <button
            type="button"
            onClick={() => onGrade(result === "right" ? "easy" : "good", mode)}
            className="min-h-11 w-full rounded-2xl border border-line px-5 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
          >
            {result === "right" ? "Trop facile" : "J’avais bon"}
          </button>
        </div>
      ) : (
        <form onSubmit={check} className="space-y-2">
          <input
            type="text"
            value={answer}
            onChange={(event) => {
              freeze();
              setAnswer(event.target.value);
            }}
            lang={mode === "translate" ? "fr" : item.language}
            aria-label={mode === "translate" ? "Traduction en français" : "Ta réponse"}
            placeholder={mode === "translate" ? "La traduction en français" : "Écris le mot"}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink"
          />
          <button type="submit" className={PRIMARY_BUTTON}>
            Vérifier
          </button>
        </form>
      )}
    </>
  );
}

/** What is shown under the answer: the meaning, the definition and the example. */
function Details({ item, showTranslation }: { item: VocabularyItem; showTranslation: boolean }) {
  return (
    <>
      {showTranslation && <p className="text-lg">{item.translation}</p>}
      {item.definition && (
        <p lang={item.language} className="text-sm text-ink-soft">
          {item.definition}
        </p>
      )}
      {item.example && (
        <p lang={item.language} className="font-serif-italic text-[15px] text-ink-soft italic">
          {item.example}
        </p>
      )}
    </>
  );
}

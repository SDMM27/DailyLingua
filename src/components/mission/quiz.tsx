"use client";

import { CheckIcon } from "@/components/icons";
import type { Language } from "@/lib/schemas/common";
import type { ComprehensionQuestion } from "@/lib/schemas/mission";

export function Quiz({
  language,
  questions,
  answers,
  onAnswer,
}: {
  language: Language;
  questions: ComprehensionQuestion[];
  answers: Readonly<Record<string, number>>;
  onAnswer: (questionId: string, optionIndex: number) => void;
}) {
  const answered = questions.filter((q) => q.id in answers);
  const correct = answered.filter((q) => answers[q.id] === q.answerIndex).length;

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const chosen = answers[q.id];
        const isAnswered = chosen !== undefined;
        return (
          <fieldset key={q.id} className="space-y-2.5">
            <legend lang={language} className="mb-2.5 font-serif text-[17px] leading-snug font-medium">
              <span className="mr-1.5 text-muted">{qi + 1}.</span>
              {q.prompt}
            </legend>
            {q.options.map((option, oi) => {
              const isCorrect = oi === q.answerIndex;
              const isChosen = oi === chosen;
              let tone = "border-line bg-surface hover:border-ink-soft";
              if (isAnswered && isCorrect) tone = "border-success bg-success-soft text-ink";
              else if (isAnswered && isChosen) tone = "border-danger bg-danger-soft text-ink";
              else if (isAnswered) tone = "border-line bg-surface opacity-60";
              return (
                <button
                  key={oi}
                  type="button"
                  lang={language}
                  disabled={isAnswered}
                  onClick={() => onAnswer(q.id, oi)}
                  aria-pressed={isChosen}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors disabled:cursor-default ${tone}`}
                >
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                      isAnswered && isCorrect ? "border-success bg-success text-paper" : "border-current"
                    }`}
                    aria-hidden="true"
                  >
                    {isAnswered && isCorrect ? <CheckIcon width={12} height={12} strokeWidth={3} /> : null}
                  </span>
                  {option}
                </button>
              );
            })}
            {isAnswered && (
              <p className="rounded-2xl px-1 text-[13px] leading-relaxed text-ink-soft" aria-live="polite">
                <strong className={chosen === q.answerIndex ? "text-success" : "text-danger"}>
                  {chosen === q.answerIndex ? "Exact. " : "Pas tout à fait. "}
                </strong>
                {q.explanation}
              </p>
            )}
          </fieldset>
        );
      })}
      {answered.length === questions.length && (
        <p className="text-sm font-semibold">
          Score : {correct} / {questions.length}
        </p>
      )}
    </div>
  );
}

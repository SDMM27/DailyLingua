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
    <div className="space-y-8">
      {questions.map((q, qi) => {
        const chosen = answers[q.id];
        const isAnswered = chosen !== undefined;
        return (
          <fieldset key={q.id}>
            <legend lang={language} className="mb-2 font-serif text-lg leading-snug font-semibold">
              <span className="mr-2 font-mono text-sm text-muted">{qi + 1}.</span>
              {q.prompt}
            </legend>
            <div className="border-t border-line">
              {q.options.map((option, oi) => {
                const isCorrect = oi === q.answerIndex;
                const isChosen = oi === chosen;
                let tone = "hover:bg-surface-sunk";
                if (isAnswered && isCorrect) tone = "bg-success-soft";
                else if (isAnswered && isChosen) tone = "bg-danger-soft";
                else if (isAnswered) tone = "opacity-60";
                return (
                  <button
                    key={oi}
                    type="button"
                    lang={language}
                    disabled={isAnswered}
                    onClick={() => onAnswer(q.id, oi)}
                    aria-pressed={isChosen}
                    className={`flex min-h-11 w-full items-start gap-3 border-b border-line px-2 py-3 text-left text-[15px] leading-snug transition-colors disabled:cursor-default ${tone}`}
                  >
                    <span
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                        isAnswered && isCorrect
                          ? "border-success bg-success text-paper"
                          : isAnswered && isChosen
                            ? "border-danger"
                            : "border-current"
                      }`}
                      aria-hidden="true"
                    >
                      {isAnswered && isCorrect ? <CheckIcon width={12} height={12} strokeWidth={3} /> : null}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
            {isAnswered && (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft" aria-live="polite">
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
        <p className="border-t border-ink pt-3 font-serif text-lg font-bold">
          Score : {correct} / {questions.length}
        </p>
      )}
    </div>
  );
}

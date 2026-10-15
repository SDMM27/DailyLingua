import type { Language } from "@/lib/schemas/common";
import {
  WRITING_CRITERIA,
  WRITING_CRITERION_LABELS,
  WRITING_FEEDBACK_LIMITS,
  type WritingFeedback,
} from "@/lib/schemas/writing-feedback";

const MAX_SCORE = WRITING_FEEDBACK_LIMITS.score.max;

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: MAX_SCORE }, (_, i) => (
        <span key={i} className={`size-2 rounded-full ${i < score ? "bg-ink" : "bg-line"}`} />
      ))}
    </span>
  );
}

/** Review of a written production: scores on four criteria, corrections and one strength. */
export function WritingFeedbackCard({ language, feedback }: { language: Language; feedback: WritingFeedback }) {
  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {WRITING_CRITERIA.map((criterion) => {
          const { score, comment } = feedback.scores[criterion];
          const label = WRITING_CRITERION_LABELS[criterion];
          return (
            <li key={criterion}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{label}</span>
                <span
                  role="img"
                  aria-label={`${label} : ${score} sur ${MAX_SCORE}`}
                  className="flex items-center gap-2 text-xs font-medium text-ink-soft"
                >
                  <ScoreDots score={score} />
                  <span aria-hidden="true">
                    {score}/{MAX_SCORE}
                  </span>
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{comment}</p>
            </li>
          );
        })}
      </ul>

      <p className="rounded-2xl bg-surface-sunk px-4 py-3 text-[13px] leading-relaxed">
        <span className="block text-xs font-semibold tracking-wide text-muted uppercase">Point fort</span>
        {feedback.strength}
      </p>

      {feedback.corrections.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Corrections</p>
          <ul className="mt-2 space-y-3">
            {feedback.corrections.map((correction, i) => (
              <li key={i} className="rounded-2xl border border-line px-4 py-3">
                <p lang={language} className="font-serif leading-relaxed">
                  <span className="rounded bg-danger-soft px-1 text-danger line-through">{correction.original}</span>
                  <span aria-hidden="true" className="mx-1.5 text-muted">
                    →
                  </span>
                  <span className="sr-only"> corrigé en </span>
                  <span className="font-semibold">{correction.corrected}</span>
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{correction.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted">Correction rédigée par une IA : elle peut contenir des erreurs.</p>
    </div>
  );
}

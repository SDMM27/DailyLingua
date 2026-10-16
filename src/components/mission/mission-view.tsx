"use client";

import { useState } from "react";
import {
  answerQuestion,
  requestWritingFeedback,
  saveExpression,
  saveProduction,
  setActivityDone,
} from "@/app/actions/mission";
import { CheckIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { ACTIVITY_LABELS } from "@/lib/domain/labels";
import { completedMinutes, missionMinutes, sessionMinutes } from "@/lib/domain/time-budget";
import type { LanguageSession, Mission, MissionProgress } from "@/lib/schemas/mission";
import type { WritingFeedbackResult, WritingReviewState } from "@/lib/schemas/writing-feedback";
import { ContentCard } from "./content-card";
import { ExpressionList } from "./expression-list";
import { ProductionTask } from "./production-task";
import { Quiz } from "./quiz";

function toggle(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

type Answers = Readonly<Record<string, Readonly<Record<string, number>>>>;

/**
 * Interactive mission. Ticks, quiz answers and saved expressions are shown at once and saved by
 * server actions; a change the server refuses is rolled back and reported. `persist` is false in
 * the demo, where progress only lives in memory.
 */
export function MissionView({
  mission,
  progress,
  persist,
  canReviewWriting = false,
}: {
  mission: Mission;
  progress: MissionProgress;
  persist: boolean;
  canReviewWriting?: boolean;
}) {
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set(progress.completedActivityIds));
  const [answers, setAnswers] = useState<Answers>(progress.answers);
  const [savedExpressions, setSavedExpressions] = useState<ReadonlySet<string>>(
    () => new Set(progress.savedExpressionIds),
  );
  const [error, setError] = useState<string | null>(null);

  /** Saves a change, rolling it back on screen if the server refuses it. */
  async function save(request: () => Promise<{ ok: boolean; error?: string }>, rollback: () => void) {
    if (!persist) return;
    const result = await request();
    if (result.ok) return setError(null);
    rollback();
    setError(`Ce changement n’a pas été enregistré : ${result.error}`);
  }

  function handleToggleActivity(activityId: string) {
    const checked = !done.has(activityId);
    setDone((d) => toggle(d, activityId));
    void save(
      () => setActivityDone({ activityId, done: checked }),
      () => setDone((d) => toggle(d, activityId)),
    );
  }

  function handleAnswer(sessionId: string, questionId: string, selectedIndex: number) {
    setAnswers((a) => ({ ...a, [sessionId]: { ...a[sessionId], [questionId]: selectedIndex } }));
    void save(
      () => answerQuestion({ sessionId, questionId, selectedIndex }),
      () =>
        setAnswers((a) => {
          const rest = Object.fromEntries(Object.entries(a[sessionId] ?? {}).filter(([id]) => id !== questionId));
          return { ...a, [sessionId]: rest };
        }),
    );
  }

  async function handleSaveProduction(sessionId: string, body: string): Promise<boolean> {
    const result = await saveProduction({ sessionId, body });
    if (result.ok) setError(null);
    else setError(`Ton texte n’a pas été enregistré : ${result.error}`);
    return result.ok;
  }

  /** Asks for the review; the server ticks the writing step whatever the outcome, so do the same here. */
  async function handleRequestFeedback(session: LanguageSession, body: string): Promise<WritingFeedbackResult | null> {
    const result = await requestWritingFeedback({ sessionId: session.id, body });
    if (!result.ok) {
      setError(`La correction n’a pas pu être demandée : ${result.error}`);
      return null;
    }
    setError(null);
    const writingIds = session.activities.filter((a) => a.kind === "writing").map((a) => a.id);
    setDone((d) => new Set([...d, ...writingIds]));
    return result.data;
  }

  function handleSaveExpression(sessionId: string, expressionId: string) {
    setSavedExpressions((s) => new Set(s).add(expressionId));
    void save(
      () => saveExpression({ sessionId, expressionId }),
      () =>
        setSavedExpressions((s) => {
          const next = new Set(s);
          next.delete(expressionId);
          return next;
        }),
    );
  }

  const total = missionMinutes(mission);
  const doneMinutes = completedMinutes(mission, done);
  const finished = doneMinutes === total;

  return (
    <>
      {/* Sticky progress, always visible while scrolling through long content. */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-[57px]">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-ink-soft">Progression</span>
          <span>
            {doneMinutes} / {total} min
          </span>
        </div>
        <ProgressBar value={doneMinutes / total} label="Progression de la mission" className="mt-2" />
      </div>

      {error && (
        <p role="alert" className="mb-6 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="space-y-12">
        {mission.sessions.map((session) => (
          <SessionSection
            key={session.id}
            session={session}
            done={done}
            onToggleActivity={handleToggleActivity}
            answers={answers[session.id] ?? {}}
            onAnswer={(questionId, optionIndex) => handleAnswer(session.id, questionId, optionIndex)}
            savedExpressions={savedExpressions}
            onSaveExpression={(expressionId) => handleSaveExpression(session.id, expressionId)}
            draft={progress.drafts[session.id] ?? ""}
            onSaveProduction={persist ? (body) => handleSaveProduction(session.id, body) : undefined}
            onRequestFeedback={
              persist && canReviewWriting ? (body) => handleRequestFeedback(session, body) : undefined
            }
            review={progress.writingReviews[session.id]}
            canReportNoAccess={persist}
          />
        ))}

        {finished && (
          <Card className="text-center" aria-live="polite">
            <p className="font-serif text-2xl font-semibold">Mission accomplie</p>
            <p className="mt-1 text-sm text-ink-soft">
              {total} minutes aujourd’hui · {savedExpressions.size} expressions mises de côté
            </p>
          </Card>
        )}
      </div>
    </>
  );
}

function SessionSection({
  session,
  done,
  onToggleActivity,
  answers,
  onAnswer,
  savedExpressions,
  onSaveExpression,
  draft,
  onSaveProduction,
  onRequestFeedback,
  review,
  canReportNoAccess,
}: {
  session: LanguageSession;
  done: ReadonlySet<string>;
  onToggleActivity: (id: string) => void;
  answers: Readonly<Record<string, number>>;
  onAnswer: (questionId: string, optionIndex: number) => void;
  savedExpressions: ReadonlySet<string>;
  onSaveExpression: (expressionId: string) => void;
  draft: string;
  onSaveProduction?: (body: string) => Promise<boolean>;
  onRequestFeedback?: (body: string) => Promise<WritingFeedbackResult | null>;
  review?: WritingReviewState;
  /** Offers « Je n’ai pas accès »; false in the demo, where nothing can be replaced. */
  canReportNoAccess: boolean;
}) {
  const { language } = session;
  const style = languageStyle(language);

  return (
    <section aria-labelledby={`session-${language}`} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id={`session-${language}`}>
          <LanguageTag language={language} />
        </h2>
        <span className="text-sm font-medium text-ink-soft">{sessionMinutes(session)} min</span>
      </div>

      <ContentCard content={session.content} sessionId={canReportNoAccess ? session.id : undefined} />

      <Card>
        <Eyebrow className="mb-3">Étapes</Eyebrow>
        <ul className="space-y-1">
          {session.activities.map((activity) => {
            const checked = done.has(activity.id);
            return (
              <li key={activity.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onToggleActivity(activity.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-sunk"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors ${
                      checked ? `border-transparent ${style.bg} text-paper` : "border-line"
                    }`}
                  >
                    {checked && <CheckIcon width={14} height={14} strokeWidth={2.6} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] ${checked ? "text-muted line-through" : ""}`}>
                      {activity.title}
                    </span>
                    <span className="text-xs text-muted">{ACTIVITY_LABELS[activity.kind]}</span>
                  </span>
                  <span className="text-xs font-medium text-muted">{activity.estimatedMinutes} min</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {session.questions.length > 0 && (
        <Card>
          <Eyebrow className="mb-4">Compréhension</Eyebrow>
          <Quiz language={language} questions={session.questions} answers={answers} onAnswer={onAnswer} />
        </Card>
      )}

      {session.expressions.length > 0 && (
        <Card>
          <Eyebrow className="mb-4">À retenir</Eyebrow>
          <ExpressionList
            language={language}
            expressions={session.expressions}
            saved={savedExpressions}
            onSave={onSaveExpression}
          />
        </Card>
      )}

      <Card>
        <ProductionTask
          language={language}
          task={session.production}
          initialText={draft}
          onSave={onSaveProduction}
          onRequestFeedback={onRequestFeedback}
          initialReview={review}
        />
      </Card>
    </section>
  );
}

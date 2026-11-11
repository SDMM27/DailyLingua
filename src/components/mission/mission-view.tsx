"use client";

import { type ReactNode, useState } from "react";
import {
  answerQuestion,
  requestWritingFeedback,
  saveExpression,
  saveProduction,
  setActivityDone,
} from "@/app/actions/mission";
import { CheckIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { ACTIVITY_LABELS, topicLabel } from "@/lib/domain/labels";
import type { Language } from "@/lib/schemas/common";
import type { Topic } from "@/lib/schemas/preferences";
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
  requestedTopics = {},
}: {
  mission: Mission;
  progress: MissionProgress;
  persist: boolean;
  canReviewWriting?: boolean;
  /** Domain asked for today, per language (« Demain, plutôt » of the day before). */
  requestedTopics?: Partial<Record<Language, Topic>>;
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
      <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-ink bg-paper/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-[57px] lg:mx-0 lg:px-0">
        <div className="flex items-baseline justify-between">
          <span className="kicker text-muted">Progression</span>
          <span className="font-serif text-base font-bold">
            {doneMinutes} / {total} min
          </span>
        </div>
        <ProgressBar value={doneMinutes / total} label="Progression de la mission" className="mt-2" />
      </div>

      {error && (
        <p role="alert" className="mb-6 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="space-y-14">
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
            requestedTopic={requestedTopics[session.language]}
          />
        ))}

        {finished && (
          <div className="rule-double border-t border-ink py-6 text-center" aria-live="polite">
            <p className="sd-display text-3xl">Mission accomplie</p>
            <p className="mt-2 text-sm text-ink-soft">
              {total} minutes aujourd’hui · {savedExpressions.size} expressions mises de côté
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/** Roman numeral heading of an exercise, like the numbered sections of a newspaper feature. */
function ExerciseTitle({ numeral, children }: { numeral: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline gap-3 border-b border-ink pb-2">
      <span aria-hidden="true" className="font-serif text-2xl font-extrabold text-accent-strong">
        {numeral}
      </span>
      <Eyebrow>{children}</Eyebrow>
    </div>
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
  requestedTopic,
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
  /** Domain the learner asked for today in this language, if any. */
  requestedTopic?: Topic;
}) {
  const { language } = session;
  const style = languageStyle(language);

  // Phones read it top to bottom (article, steps, quiz, expressions, writing). From `lg` the
  // article and the exercises sit in the main column, steps and expressions in the side column:
  // the two wrappers are `contents` on phones so that the blocks keep that order.
  return (
    <section aria-labelledby={`session-${language}`} className="border-t-[3px] border-ink pt-4">
      <div className="mb-6 flex items-center justify-between">
        <h2 id={`session-${language}`}>
          <LanguageTag language={language} />
        </h2>
        <span className="kicker text-muted">{sessionMinutes(session)} min</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-0">
        <div className="contents lg:block lg:min-w-0 lg:space-y-12 lg:pr-10">
          <div className="order-1 min-w-0">
            <ContentCard content={session.content} sessionId={canReportNoAccess ? session.id : undefined} />

            {requestedTopic && !session.content.topics.includes(requestedTopic) && (
              <p className="mt-4 max-w-[68ch] text-[13px] leading-relaxed text-muted">
                Pas de contenu {topicLabel(requestedTopic).toLocaleLowerCase("fr")} à ton niveau aujourd’hui : voici un autre sujet.
              </p>
            )}
          </div>

          {session.questions.length > 0 && (
            <div className="order-3 min-w-0">
              <ExerciseTitle numeral="I">Compréhension</ExerciseTitle>
              <div className="max-w-[68ch]">
                <Quiz language={language} questions={session.questions} answers={answers} onAnswer={onAnswer} />
              </div>
            </div>
          )}

          <div className="order-5 min-w-0">
            <ExerciseTitle numeral={session.questions.length > 0 ? "II" : "I"}>Production</ExerciseTitle>
            <ProductionTask
              language={language}
              task={session.production}
              initialText={draft}
              onSave={onSaveProduction}
              onRequestFeedback={onRequestFeedback}
              initialReview={review}
            />
          </div>
        </div>

        <aside className="contents lg:block lg:min-w-0 lg:space-y-12 lg:border-l lg:border-line lg:pl-10">
          <div className="order-2 min-w-0">
            <Eyebrow className="mb-2">Étapes</Eyebrow>
            <ul className="divide-y divide-line border-y border-line">
              {session.activities.map((activity) => {
                const checked = done.has(activity.id);
                return (
                  <li key={activity.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => onToggleActivity(activity.id)}
                      className="flex min-h-11 w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-surface-sunk"
                    >
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors ${
                          checked ? `border-transparent ${style.bg} text-paper` : "border-ink-soft"
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
          </div>

          {session.expressions.length > 0 && (
            <div className="order-4 min-w-0">
              <Eyebrow className="mb-2">À retenir</Eyebrow>
              <ExpressionList
                language={language}
                expressions={session.expressions}
                saved={savedExpressions}
                onSave={onSaveExpression}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

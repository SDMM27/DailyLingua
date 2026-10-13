"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { ACTIVITY_LABELS } from "@/lib/domain/labels";
import { completedMinutes, missionMinutes, sessionMinutes } from "@/lib/domain/time-budget";
import type { LanguageSession, Mission } from "@/lib/schemas/mission";
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

/**
 * Interactive mission. Progress is local state only for now;
 * persistence arrives with the database in phase 3.
 */
export function MissionView({ mission }: { mission: Mission }) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [answers, setAnswers] = useState<Readonly<Record<string, number>>>({});
  const [savedExpressions, setSavedExpressions] = useState<ReadonlySet<string>>(new Set());

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

      <div className="space-y-12">
        {mission.sessions.map((session) => (
          <SessionSection
            key={session.language}
            session={session}
            done={done}
            onToggleActivity={(id) => setDone((d) => toggle(d, id))}
            answers={answers}
            onAnswer={(qid, oi) => setAnswers((a) => ({ ...a, [qid]: oi }))}
            savedExpressions={savedExpressions}
            onToggleExpression={(id) => setSavedExpressions((s) => toggle(s, id))}
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
  onToggleExpression,
}: {
  session: LanguageSession;
  done: ReadonlySet<string>;
  onToggleActivity: (id: string) => void;
  answers: Readonly<Record<string, number>>;
  onAnswer: (questionId: string, optionIndex: number) => void;
  savedExpressions: ReadonlySet<string>;
  onToggleExpression: (id: string) => void;
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

      <ContentCard content={session.content} />

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
            onToggleSave={onToggleExpression}
          />
        </Card>
      )}

      <Card>
        <ProductionTask language={language} task={session.production} />
      </Card>
    </section>
  );
}

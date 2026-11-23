"use client";

import { gradeUnitItem, type AccentTolerance } from "@dailylingua/core";
import type { UnitItem } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { estimateItemXp, expectedText } from "@/lib/units/flow";
import { FeedbackSheet, type Verdict } from "./feedback-sheet";
import { ItemView, useKindLabel } from "./item-view";
import { ShellBody, ShellFooter } from "./unit-shell";

/** One recorded try of an item. */
export interface ItemAttempt {
  item: UnitItem;
  /** 1 to 3. */
  tryNumber: 1 | 2 | 3;
  answer: string;
  correct: boolean;
  shownAt: string;
}

interface Feedback {
  verdict: Verdict;
  xp: number;
  nearMiss: boolean;
  comesBack: boolean;
}

/**
 * Runs the items of a step one at a time. A first wrong try says « À revoir » and offers « Réessayer » without the
 * answer; a second one shows the expected answer and the explanation, and the item comes back once at the end of the
 * step (`requeue`) for a third and last try, which earns no XP. Every try is reported (`onAttempt`), the XP is an
 * estimate (the server decides).
 */
export function ExerciseRunner({ items, language, locale, tolerance, requeue = true, showXp = true, context, onAttempt, onXp, onProgress, onDone }: {
  items: UnitItem[];
  language: string;
  locale: "fr" | "en";
  tolerance: AccentTolerance;
  requeue?: boolean;
  /** Whether the feedback shows the estimated XP (not in the review of a passed unit, nor in a warm-up). */
  showXp?: boolean;
  /** What to show above the current item (the previous turns of a conversation). */
  context?(item: UnitItem): ReactNode;
  onAttempt(attempt: ItemAttempt): void;
  onXp(xp: number): void;
  /** Share of the step done, 0 to 1, for the bar. */
  onProgress?(share: number): void;
  onDone(): void;
}) {
  const t = useTranslations("exercise");
  const check = useTranslations("dailySession");
  const kindLabel = useKindLabel();
  const [queue, setQueue] = useState(() => items.map((item) => item.id));
  const [position, setPosition] = useState(0);
  const [tries, setTries] = useState<Record<string, number>>({});
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [wrongMark, setWrongMark] = useState(false);
  const shownAt = useRef(new Date().toISOString());

  const item = items.find((entry) => entry.id === queue[position]);
  if (!item) return null;
  const tryNumber = Math.min(3, (tries[item.id] ?? 0) + 1) as 1 | 2 | 3;
  const explain = item.explain[locale];

  function submit() {
    if (!item || answer === null || feedback) return;
    const grade = gradeUnitItem(language, item, answer, tolerance);
    onAttempt({ item, tryNumber, answer, correct: grade.correct, shownAt: shownAt.current });
    setTries((previous) => ({ ...previous, [item.id]: tryNumber }));
    if (grade.correct) {
      const xp = estimateItemXp(tryNumber, true);
      if (xp > 0) onXp(xp);
      setFeedback({ verdict: "correct", xp, nearMiss: false, comesBack: false });
    } else if (tryNumber === 1) {
      setWrongMark(true);
      setFeedback({ verdict: "retry", xp: 0, nearMiss: grade.nearMiss, comesBack: false });
    } else {
      const again = requeue && tryNumber === 2;
      if (again) setQueue((previous) => [...previous, item.id]);
      setFeedback({ verdict: "wrong", xp: 0, nearMiss: grade.nearMiss, comesBack: again });
    }
  }

  function retry() {
    setFeedback(null);
    shownAt.current = new Date().toISOString();
  }

  function next() {
    setFeedback(null);
    setWrongMark(false);
    setAnswer(null);
    shownAt.current = new Date().toISOString();
    setRound((value) => value + 1);
    const following = position + 1;
    onProgress?.(Math.min(1, following / queue.length));
    if (following >= queue.length) onDone();
    else setPosition(following);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="contents">
      <ShellBody>
        <div inert={feedback !== null} className="space-y-5">
          <p className="meta">{kindLabel(item.kind)} · {t("count", { index: position + 1, total: queue.length })}</p>
          {context?.(item)}
          <ItemView key={`${item.id}:${round}`} item={item} language={language} locale={locale} locked={feedback !== null} wrong={wrongMark && feedback === null} onAnswer={setAnswer} />
        </div>
      </ShellBody>
      <ShellFooter>
        <Button type="submit" aria-disabled={answer === null || feedback !== null} onClick={(event) => { if (answer === null) event.preventDefault(); }}>{check("check")}</Button>
      </ShellFooter>
      {feedback && (
        <FeedbackSheet
          verdict={feedback.verdict}
          xp={showXp ? feedback.xp : null}
          language={language}
          locale={locale}
          expected={feedback.verdict === "wrong" ? expectedText(item, locale) : null}
          explanation={explain}
          hint={item.kind === "cloze" ? item.hint?.[locale] : null}
          nearMiss={feedback.nearMiss}
          comesBack={feedback.comesBack}
          onContinue={next}
          onRetry={retry}
        />
      )}
    </form>
  );
}

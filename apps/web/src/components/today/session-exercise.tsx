"use client";

import { gradeCardRecall, gradeChoice, gradeTyped, type AccentTolerance, type Graded } from "@dailylingua/core";
import { MAX_ANSWER_CHARS } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { itemOptions, type SessionEvent, type SessionScreen } from "@/lib/session-packet/session-flow";

type Exercise = Extract<SessionScreen, { kind: "card" | "item" | "error" }>;

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function SessionExercise({ screen, language, sessionId, accentTolerance, busy, onAnswer }: {
  screen: Exercise;
  language: string;
  sessionId: string;
  accentTolerance: AccentTolerance;
  busy: boolean;
  onAnswer(event: SessionEvent, feedback: Graded): void;
}) {
  const t = useTranslations("dailySession");
  const [answer, setAnswer] = useState("");
  const [shownAt] = useState(() => new Date().toISOString());
  const card = screen.kind === "card" ? screen.card : null;
  const item = screen.kind === "item" ? screen.item : null;
  const error = screen.kind === "error" ? screen.error : null;
  const repair = error ?? (card?.correctionHighlight ? { sentence: card.front, highlighted: card.correctionHighlight } : null);
  const highlight = repair ? repair.sentence.indexOf(repair.highlighted) : -1;
  const options = card?.options ?? (item ? itemOptions(item) : []);
  const prompt = card
    ? card.mode === "production" ? card.back : card.front
    : text(item?.prompt.question) ?? text(item?.prompt.sentence) ?? text(item?.prompt.prompt);

  function check() {
    const value = answer.trim();
    if (!value || busy) return;
    if (card) {
      const key = { optionId: card.correctOptionId, accept: card.accept };
      const result = gradeCardRecall({ language, mode: card.mode, answer: value, key, tolerance: accentTolerance });
      const option = options.find(({ id }) => id === key.optionId);
      const answeredAt = new Date().toISOString();
      onAnswer({
        kind: "review_attempt",
        payload: { sessionId, cardId: card.id, mode: card.mode, answer: value, shownAt: shownAt < answeredAt ? shownAt : answeredAt, answeredAt, audioPlays: 0 },
      }, { ...result, shown: result.correct ? result.shown : option?.text ?? result.shown });
    } else if (error) {
      const result = gradeTyped({ language, kind: "cloze", answer: value, accept: error.accept, tolerance: accentTolerance });
      const answeredAt = new Date().toISOString();
      onAnswer({
        kind: "focus_attempt",
        payload: { sessionId, itemId: error.itemId, try: 1, answer: value, shownAt: shownAt < answeredAt ? shownAt : answeredAt },
      }, result);
    } else if (item) {
      const accept = [...new Set([...(item.key.answer ? [item.key.answer] : []), ...item.key.accept])];
      const result = item.kind === "mcq" ? gradeChoice(value, item.key.answer) : gradeTyped({ language, kind: item.kind, answer: value, accept, tolerance: accentTolerance });
      const option = options.find(({ id }) => id === item.key.answer);
      const base = { sessionId, itemId: item.id, answer: value };
      const event: SessionEvent = screen.step === "workshop"
        ? { kind: "focus_attempt", payload: { ...base, try: 1, shownAt: shownAt < new Date().toISOString() ? shownAt : new Date().toISOString() } }
        : { kind: "comprehension_answer", payload: base };
      onAnswer(event, { ...result, shown: result.correct ? result.shown : option?.text ?? result.shown });
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); check(); }}>
      {prompt && !repair && <p className="sd-display break-words text-2xl" lang={card?.mode === "production" ? undefined : language} dir="auto">{prompt}</p>}
      {repair && (
        <div className="space-y-2">
          <p>{t("errorOfDayInstruction")}</p>
          <p className="sd-display break-words text-2xl" lang={language} dir="auto">
            {highlight < 0 ? repair.sentence : <>
              {repair.sentence.slice(0, highlight)}
              <mark className="rounded bg-accent/15 text-ink">{repair.highlighted}</mark>
              {repair.sentence.slice(highlight + repair.highlighted.length)}
            </>}
          </p>
        </div>
      )}
      {options.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="sr-only">{t("choose")}</legend>
          {options.map((option) => (
            <label key={option.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2 has-checked:border-accent">
              <input type="radio" name="answer" checked={answer === option.id} onChange={() => setAnswer(option.id)} />
              <span className="min-w-0 break-words" dir="auto">{option.text}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="block space-y-2">
          <span>{t("answer")}</span>
          <input
            className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-xl"
            lang={language}
            dir="auto"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_ANSWER_CHARS}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </label>
      )}
      <Button type="submit" disabled={busy || answer.trim() === ""}>{t("check")}</Button>
    </form>
  );
}

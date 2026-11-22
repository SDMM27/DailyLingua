"use client";

import { countWords, FLUENCY_MIN_MS, learningDay, minReadingMs, PRODUCTION_MIN_WORDS, type AccentTolerance, type Graded } from "@dailylingua/core";
import { MAX_PRODUCTION_CHARS, type SessionPacket } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { EventSyncApi } from "@/components/pwa/event-sync-provider";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import type { LocalSessionProgress } from "@/lib/offline/indexeddb-queue";
import { useOnlineStatus } from "@/lib/offline/online-status";
import { readingEvent, sessionScreens, stepNumber, type SessionEvent } from "@/lib/session-packet/session-flow";
import { SessionExercise } from "./session-exercise";
import { WritingFeedback } from "./writing-feedback";

export function SessionPanel({ packet, initial, sync, accentTolerance, animateSummary, onLeave }: {
  packet: SessionPacket;
  initial: LocalSessionProgress;
  sync: EventSyncApi;
  accentTolerance: AccentTolerance;
  animateSummary: boolean;
  onLeave(progress: LocalSessionProgress): void;
}) {
  const t = useTranslations("dailySession");
  const online = useOnlineStatus();
  const [progress, setProgress] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"saveError" | "dayEnded" | null>(null);
  const [feedback, setFeedback] = useState<(Graded & { explanation?: string; explanationLanguage?: string }) | null>(null);
  const [paused, setPaused] = useState(false);
  const savingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const screens = sessionScreens(packet);
  const index = screens.findIndex((screen) => screen.key === progress.position);
  const screen = screens[index < 0 ? screens.length - 1 : index]!;
  const following = screens[index + 1]?.key ?? "summary";
  const position = stepNumber(screen.step);
  const id = packet.session.id;
  const language = packet.session.language;

  useEffect(() => {
    heading.current?.focus();
  }, [screen.key, feedback, paused]);

  async function save(events: SessionEvent[], next: string, startedAt: string | null = null, after?: (saved: LocalSessionProgress) => void) {
    if (savingRef.current) return;
    const now = new Date();
    if (learningDay(now, packet.timeZone) !== packet.session.day) {
      setError("dayEnded");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const nextProgress = { revision: progress.revision + 1, position: next, startedAt };
    try {
      if (await sync.advanceSession(id, progress.revision, nextProgress, events, now.toISOString())) {
        setProgress(nextProgress);
        after?.(nextProgress);
      } else {
        const latest = await sync.readProgress(id);
        if (!latest) throw new Error("Session progress could not be read");
        setFeedback(null);
        setProgress(latest);
      }
    } catch {
      setError("saveError");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section data-daily-session>
      {paused && <div className="space-y-5">
        <h1 ref={heading} tabIndex={-1} className="sd-display text-3xl">{t("pauseTitle")}</h1>
        <p>{t("pauseBody", { step: t(`steps.${screen.step}`) })}</p>
        <Button onClick={() => setPaused(false)}>{t("continue")}</Button>
        <Button variant="secondary" onClick={() => onLeave(progress)}>{t("leave")}</Button>
      </div>}
      <div className="space-y-6" hidden={paused}>
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="min-w-11 px-0" disabled={saving} aria-label={t("pauseTitle")} onClick={() => setPaused(true)}>
              <span aria-hidden="true">×</span>
            </Button>
            <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={position} aria-label={t("progress", { position })}>
              {Array.from({ length: 6 }, (_, offset) => (
                <span key={offset} aria-hidden="true" className={`h-1 flex-1 rounded-full ${offset < position ? "bg-accent" : "bg-line"}`} />
              ))}
            </div>
            {!online && <span className="meta" role="status">{t("offline")}</span>}
          </div>
          <h1 ref={paused ? undefined : heading} tabIndex={-1} className="sd-display text-3xl">{feedback ? t(feedback.verdict) : t(`steps.${screen.step}`)}</h1>
        </header>

        {feedback ? (
          <div className="space-y-4">
            {feedback.shown && <p className="rounded-xl border border-line bg-surface p-4 text-lg" lang={language} dir="auto">{feedback.shown}</p>}
            {feedback.explanation && <p className="text-muted" lang={feedback.explanationLanguage} dir="auto">{feedback.explanation}</p>}
            <Button onClick={() => setFeedback(null)}>{t("continue")}</Button>
          </div>
        ) : (
          <>
            {(screen.kind === "card" || screen.kind === "item" || screen.kind === "error") && (
              <>
                {screen.kind === "item" && screen.item.listeningOnly && packet.text && <ListeningPassage text={packet.text} />}
                <SessionExercise
                  key={screen.key}
                  screen={screen}
                  sessionId={id}
                  language={language}
                  accentTolerance={accentTolerance}
                  busy={saving}
                  onAnswer={(event, result) => {
                    const extra = screen.kind === "error" ? {
                      explanation: screen.error.explanation, explanationLanguage: screen.error.explanationLanguage,
                    } : {};
                    void save([event], following, null, () => setFeedback({ ...result, ...extra }));
                  }}
                />
              </>
            )}
            {(screen.kind === "text" || screen.kind === "reread") && (
              <TimedReading
                key={screen.key}
                text={screen.text}
                reread={screen.kind === "reread"}
                wordLimit={packet.momentumWords}
                startedAt={progress.startedAt}
                saving={saving}
                onStart={() => {
                  const startedAt = new Date().toISOString();
                  const events = screen.kind === "text" ? [readingEvent(id, screen.text.id, 0)] : [];
                  void save(events, screen.key, startedAt);
                }}
                onFinish={(startedAt, endedAt) => {
                  const event: SessionEvent = screen.kind === "text"
                    ? readingEvent(id, screen.text.id, 1)
                    : { kind: "fluency_pass", payload: { sessionId: id, textId: screen.text.id, startedAt, endedAt } };
                  void save([event], following);
                }}
              />
            )}
            {screen.kind === "write" && (
              <WritingTask
                text={screen.text}
                saving={saving}
                onSubmit={(text, composeMs) => {
                  void save([{ kind: "production_submitted", payload: { sessionId: id, productionId: crypto.randomUUID(), text, composeMs } }], following);
                }}
              />
            )}
            {screen.kind === "summary" && (
              <div className={animateSummary && progress.position !== "closed" ? "session-summary-enter space-y-5" : "space-y-5"}>
                <p>{t(packet.text ? "summaryBody" : screens.some(({ kind }) => kind === "card" || kind === "error") ? "reviewSummaryBody" : "noReviews")}</p>
                <WritingFeedback sync={sync} sessionId={id} />
                <Button disabled={saving} onClick={() => {
                  if (progress.position === "closed") onLeave(progress);
                  else void save([{ kind: "ui_event", payload: { name: "bilan_closed", value: { sessionId: id } } }], "closed", null, onLeave);
                }}>{t("finish")}</Button>
              </div>
            )}
          </>
        )}
        {error && <FormMessage kind="error">{t(error)}</FormMessage>}
      </div>
    </section>
  );
}

type Text = NonNullable<SessionPacket["text"]>;

function ListeningPassage({ text }: { text: Text }) {
  const t = useTranslations("dailySession");
  const [fallback, setFallback] = useState(false);
  const segment = text.listeningSegment;
  if (!segment) return null;
  const sentences = Array.from(new Intl.Segmenter(text.language, { granularity: "sentence" }).segment(text.body), ({ segment }) => segment);
  const excerpt = sentences.slice(segment.from, segment.to + 1).join("").trim();
  if (!excerpt) return null;
  function speak() {
    const synthesis = window.speechSynthesis;
    const voice = synthesis?.getVoices().find((voice) => voice.lang.split("-")[0]?.toLowerCase() === text.language.split("-")[0]?.toLowerCase());
    if (!voice) {
      setFallback(true);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(excerpt);
    utterance.voice = voice;
    utterance.lang = text.language;
    utterance.onerror = () => setFallback(true);
    synthesis.cancel();
    synthesis.speak(utterance);
  }
  return fallback ? (
    <div className="space-y-2">
      <p className="text-muted">{t("audioUnavailable")}</p>
      <p lang={text.language} dir="auto">{excerpt}</p>
    </div>
  ) : <Button variant="secondary" onClick={speak}>{t("listen")}</Button>;
}

function TimedReading({ text, reread, wordLimit, startedAt, saving, onStart, onFinish }: {
  text: Text;
  reread: boolean;
  wordLimit?: number | null;
  startedAt: string | null;
  saving: boolean;
  onStart(): void;
  onFinish(startedAt: string, endedAt: string): void;
}) {
  const t = useTranslations("dailySession");
  const [tooFast, setTooFast] = useState(false);
  const words = reread ? Math.min(text.wordCount, wordLimit ?? text.wordCount) : text.wordCount;
  const minimum = reread ? Math.max(minReadingMs(words), FLUENCY_MIN_MS) : minReadingMs(words);
  let body = text.body;
  if (reread && words < text.wordCount) {
    const segments = new Intl.Segmenter(text.language, { granularity: "word" }).segment(body);
    let seen = 0;
    for (const segment of segments) {
      if (segment.isWordLike && ++seen > words) {
        body = body.slice(0, segment.index).trimEnd();
        break;
      }
    }
  }
  return (
    <div className="space-y-5">
      <h2 className="sd-display text-2xl" lang={text.language} dir="auto">{text.title}</h2>
      {startedAt ? (
        <>
          <p className="whitespace-pre-line break-words text-[19px] leading-relaxed" lang={text.language} dir="auto">{body}</p>
          {tooFast && <FormMessage kind="notice">{t("readAgain")}</FormMessage>}
          <Button disabled={saving} onClick={() => {
            const ended = new Date();
            if (ended.getTime() - Date.parse(startedAt) < minimum) setTooFast(true);
            else onFinish(startedAt, ended.toISOString());
          }}>{t(reread ? "endReread" : "questions")}</Button>
        </>
      ) : (
        <>
          {reread && <p>{t("rereadInstruction")}</p>}
          <Button disabled={saving} onClick={onStart}>{t(reread ? "startReread" : "startReading")}</Button>
        </>
      )}
    </div>
  );
}

function WritingTask({ text, saving, onSubmit }: { text: Text; saving: boolean; onSubmit(value: string, composeMs: number): void }) {
  const t = useTranslations("dailySession");
  const [value, setValue] = useState("");
  const [start] = useState(Date.now);
  const words = countWords(text.language, value);
  const minimum = PRODUCTION_MIN_WORDS[text.levelBand];
  return (
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      if (!saving && words >= minimum) onSubmit(value.trim(), Math.max(0, Date.now() - start));
    }}>
      <label className="block space-y-3">
        <span className="sd-display block text-2xl" lang={text.language} dir="auto">{text.writingTask}</span>
        <textarea
          className="min-h-48 w-full rounded-xl border border-line bg-surface p-3 text-[17px]"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MAX_PRODUCTION_CHARS}
          lang={text.language}
          dir="auto"
          aria-describedby="writing-count"
        />
      </label>
      <p className="text-muted" id="writing-count">{t("wordCount", { words, minimum })}</p>
      <Button type="submit" disabled={saving || words < minimum}>{t("submitWriting")}</Button>
    </form>
  );
}

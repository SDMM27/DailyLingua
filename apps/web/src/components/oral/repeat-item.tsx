"use client";

import { compareSpoken, SHADOWING_MIN_RATIO, type SpokenComparison } from "@dailylingua/core";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ShellBody, ShellFooter } from "@/components/unit/unit-shell";
import { useClip } from "@/components/unit/use-clip";
import type { UnitEvent } from "@/lib/units/events";
import { chunksOf, oralAttemptEvent, repeatXp } from "@/lib/oral/session";
import type { OralPacketSentence } from "@/lib/oral/select-oral";
import { markSpeechPrivacySeen, speechPrivacySeen } from "@/lib/speech/privacy";
import { useRecognition } from "@/lib/speech/use-recognition";
import { SLOW_RATE } from "./oral-audio";
import { OralPlayer, SelfRatingFooter } from "./oral-player";
import { WordDiff } from "./word-diff";

/** What the learner did on a sentence: the best share of right words, or null when they rated themselves. */
export interface RepeatOutcome {
  ratio: number | null;
  /** Judged right: from 60 % of the words, or « Proche » when self-rated. */
  passed: boolean;
  declared: boolean;
}

/** Tries a sentence allows. */
const MAX_TRIES = 2;

interface Attempt {
  comparison: SpokenComparison;
  transcript: string;
}

/** What the device heard, live, as the learner speaks. */
function LiveTranscript({ text, language }: { text: string; language: string }) {
  const t = useTranslations("oral.repeat");
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-line bg-surface p-4">
      <p className="meta">{t("hearing")}</p>
      <p className="mt-2 min-h-[1.5em] font-display text-[19px] leading-snug" lang={language} dir="auto">
        {text}
        <span aria-hidden="true" className="ms-0.5 inline-block h-5 w-0.5 translate-y-1 bg-accent-strong motion-safe:animate-pulse" />
      </p>
    </div>
  );
}

/**
 * Repetition: the learner hears the voice, taps the mic and repeats. The device's text is compared with the model word by
 * word (graded here for the immediate feedback; the server grades again from the event). Without recognition, or when the
 * microphone is refused, the learner repeats and rates themselves, declared and without XP: nothing is recorded.
 */
export function RepeatItem({ sentence, language, locale, index, total, xpVisible, onEvent, onDone }: {
  sentence: OralPacketSentence;
  language: string;
  locale: "fr" | "en";
  index: number;
  total: number;
  xpVisible: boolean;
  onEvent(event: UnitEvent): void;
  onDone(outcome: RepeatOutcome): void;
}) {
  const t = useTranslations("oral.repeat");
  const oral = useTranslations("oral");
  const unit = useTranslations("unit");
  const clip = useClip();
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [tries, setTries] = useState(0);
  const [privacy, setPrivacy] = useState(false);
  const shownAt = useRef(new Date().getTime());
  const startedAt = useRef(0);
  const best = useRef<number | null>(null);

  function onFinal(transcript: string) {
    const comparison = compareSpoken(language, sentence.text, transcript);
    onEvent(oralAttemptEvent({ sentence, activity: "shadowing", answer: transcript, recognizer: "device", selfRating: null, shownAt: shownAt.current, startedAt: startedAt.current }));
    best.current = Math.max(best.current ?? 0, comparison.ratio);
    setAttempt({ comparison, transcript });
    setTries((value) => value + 1);
  }

  const recognition = useRecognition(language, { onFinal });
  const listening = recognition.status === "listening";
  const unavailable = clip.state === "unavailable";
  const rate = slow ? SLOW_RATE : 1;
  // Where nothing recognises speech (or the microphone is refused) the learner rates themselves.
  const fallback = recognition.status === "unavailable" || (recognition.status === "error" && recognition.error !== "no-speech");
  const note = recognition.status === "unavailable" ? "unsupported" : recognition.error === "denied" ? "micDenied" : recognition.error === "failed" ? "failed" : null;

  function replay() {
    clip.play(sentence.audio, { rate });
  }

  function listen() {
    clip.stop();
    startedAt.current = Date.now();
    recognition.start();
  }

  function onMic() {
    if (speechPrivacySeen()) listen();
    else setPrivacy(true);
  }

  function understood() {
    markSpeechPrivacySeen();
    setPrivacy(false);
    listen();
  }

  function again() {
    setAttempt(null);
    recognition.reset();
  }

  function finish(passed: boolean) {
    onDone({ ratio: best.current, passed, declared: false });
  }

  function selfRate(rating: "almost" | "not_yet") {
    onEvent(oralAttemptEvent({ sentence, activity: "shadowing", answer: "", recognizer: "none", selfRating: rating, shownAt: shownAt.current, startedAt: shownAt.current }));
    onDone({ ratio: null, passed: rating === "almost", declared: true });
  }

  return (
    <>
      <ShellBody>
        <div inert={attempt !== null} className="flex flex-col gap-8 pt-7">
          <h1 className="meta text-lang">{t("instruction", { index, total })}</h1>
          <div>
            <p className="font-display text-[28px] leading-[1.3] font-semibold tracking-tight" lang={language} dir="auto">{sentence.text}</p>
            <p className="mt-2 text-[17px] text-muted" lang={locale}>{sentence.translation}</p>
          </div>
          {listening && <LiveTranscript text={recognition.transcript} language={language} />}
          {recognition.error === "no-speech" && <p role="status" className="text-sm text-ink">{t("noSpeech")}</p>}
          {fallback && note && <p role="status" className="text-sm text-muted">{t(note)}</p>}
          {unavailable && <p role="status" className="text-sm text-muted">{unit("audioUnavailable")}</p>}
        </div>
      </ShellBody>
      <ShellFooter className="px-0 pt-0">
        <div inert={attempt !== null}>
          {fallback ? (
            <SelfRatingFooter slow={slow} canReplay={!unavailable} label={t("replay")} onSlow={() => setSlow((value) => !value)} onReplay={replay} onRate={selfRate} />
          ) : (
            <OralPlayer
              listening={listening}
              slow={slow}
              canReplay={!unavailable}
              onSlow={() => setSlow((value) => !value)}
              onMic={onMic}
              onStop={recognition.stop}
              onReplay={replay}
            />
          )}
        </div>
      </ShellFooter>
      {attempt && (
        <RepeatResult
          sentence={sentence}
          language={language}
          attempt={attempt}
          showXp={xpVisible}
          canRetry={tries < MAX_TRIES}
          onContinue={() => finish((best.current ?? 0) >= SHADOWING_MIN_RATIO)}
          onRetry={again}
        />
      )}
      {privacy && (
        <BottomSheet labelledBy="speech-privacy-title" onClose={() => setPrivacy(false)}>
          <h2 id="speech-privacy-title" data-sheet-title tabIndex={-1} className="font-display text-[22px] leading-tight font-bold">{oral("privacySheet.title")}</h2>
          <p className="mt-2 text-muted">{oral("privacySheet.body")}</p>
          <div className="mt-5"><Button onClick={understood}>{oral("privacySheet.ok")}</Button></div>
        </BottomSheet>
      )}
    </>
  );
}

/** The calm sheet after an attempt: a written verdict, the word-by-word comparison, what to do next. */
function RepeatResult({ sentence, language, attempt, showXp, canRetry, onContinue, onRetry }: {
  sentence: OralPacketSentence;
  language: string;
  attempt: Attempt;
  showXp: boolean;
  canRetry: boolean;
  onContinue(): void;
  onRetry(): void;
}) {
  const t = useTranslations("oral.repeat");
  const exercise = useTranslations("exercise");
  const actions = useTranslations("common.actions");
  const { comparison, transcript } = attempt;
  const good = comparison.ratio >= SHADOWING_MIN_RATIO;
  const percent = Math.round(comparison.ratio * 100);
  const matched = comparison.tokens.filter((token) => token.status === "ok").length;
  const said = comparison.tokens.filter((token) => token.status !== "missing").length;
  const modelWords = comparison.tokens.filter((token) => token.status !== "extra").length;
  const xp = repeatXp(comparison.ratio);
  const chunks = chunksOf(sentence.text);
  return (
    <BottomSheet labelledBy="repeat-title" modal={false} tone="calm">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h2 id="repeat-title" data-sheet-title tabIndex={-1} className="flex items-center gap-2.5 font-display text-[22px] leading-tight font-bold">
          {good ? <Icon name="check" className="size-[22px] text-success" /> : <Icon name="repeat" className="size-[22px] text-accent-strong" />}
          {t(good ? "good" : "again")}
        </h2>
        {good && showXp && xp > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-3 py-1 font-mono text-base font-medium text-xp">
            <Icon name="xp" className="size-4" />
            {exercise("xp", { xp })}
          </span>
        )}
      </div>
      <div className="mt-3 max-h-[52dvh] overflow-y-auto">
        <WordDiff language={language} tokens={comparison.tokens} transcript={transcript} />
        <p className="mt-3 font-mono text-[13px] text-muted">{t("score", { matched, total: Math.max(modelWords, said), percent })}</p>
        {!good && (
          <p className="mt-3 text-sm text-ink">{chunks ? t("chunkTip", { a: chunks[0], b: chunks[1] }) : t("retryTip")}</p>
        )}
        <p className="mt-3 text-[13px] text-muted">{t("disclaimer")}</p>
      </div>
      <div className="mt-4 space-y-1">
        {good ? (
          <>
            <Button onClick={onContinue}>{actions("continue")}</Button>
            {canRetry && <Button variant="ghost" className="w-full" onClick={onRetry}>{t("restart")}</Button>}
          </>
        ) : canRetry ? (
          <>
            <Button onClick={onRetry}>{t("retry")}</Button>
            <Button variant="ghost" className="w-full" onClick={onContinue}>{t("skip")}</Button>
          </>
        ) : (
          <Button onClick={onContinue}>{t("skip")}</Button>
        )}
      </div>
    </BottomSheet>
  );
}

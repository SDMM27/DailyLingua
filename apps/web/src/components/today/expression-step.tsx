"use client";

import { countWords, PRODUCTION_MIN_WORDS } from "@dailylingua/core";
import { MAX_PRODUCTION_CHARS, type SessionPacket } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { DICTATION_MAX_MS, DICTATION_TARGET_MS, useDictation } from "@/lib/speech/use-dictation";
import { useSpeechSupported } from "@/lib/speech/use-recognition";
import { useSpeechPrivacy } from "./speech-privacy";

type Text = NonNullable<SessionPacket["text"]>;

/** Write or Say: the choice of the learner, kept for the whole session by the panel. */
export type AnswerMode = "write" | "say";

/** What the expression step hands over: the text, and for a dictation the time spent speaking. */
export interface Production {
  text: string;
  composeMs: number;
  speakingMs?: number;
}

/** mm:ss of a duration. */
function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The two segments at the top of the step (44 px each); the caller hides it where the device cannot recognise speech. */
function SpeakSwitch({ mode, onChange }: { mode: AnswerMode; onChange(mode: AnswerMode): void }) {
  const t = useTranslations("expression");
  return (
    <div role="group" aria-label={t("mode")} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
      {(["write", "say"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-base font-semibold ${mode === value ? "bg-surface shadow-[inset_0_0_0_1px_var(--sd-border-strong)]" : "text-muted"}`}
        >
          <Icon name={value === "write" ? "pen" : "mic"} className="size-5" />
          {t(value)}
        </button>
      ))}
    </div>
  );
}

/**
 * The mic (76 px, accent) in a 104 px ring that fills as the time goes: a tick for the minute asked (half of the ring, at
 * the bottom), the end of the ring at two minutes, where the listening stops by itself. While listening the mic is a
 * stop button.
 */
function TimerMic({ listening, elapsedMs, label, onPress }: { listening: boolean; elapsedMs: number; label: string; onPress(): void }) {
  const t = useTranslations("expression");
  const target = clock(DICTATION_TARGET_MS);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="relative grid size-[104px] place-items-center">
        <svg viewBox="0 0 104 104" aria-hidden="true" className="pointer-events-none absolute inset-0 -rotate-90 fill-none">
          <circle cx="52" cy="52" r="48" className="stroke-surface-2" strokeWidth="4" />
          <circle cx="52" cy="52" r="48" pathLength="100" className="stroke-accent-strong" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${Math.min(100, (elapsedMs / DICTATION_MAX_MS) * 100)} 100`} />
          <line x1="52" y1="0" x2="52" y2="9" className="stroke-muted" strokeWidth="2" transform="rotate(180 52 52)" />
        </svg>
        {listening ? (
          <button
            type="button"
            aria-label={label}
            onClick={onPress}
            className="relative grid size-[76px] place-items-center rounded-full bg-surface text-accent-strong shadow-[inset_0_0_0_3px_var(--sd-accent-strong)]"
          >
            <Icon name="stop" className="size-[22px]" />
          </button>
        ) : (
          <button type="button" aria-label={label} onClick={onPress} className="relative grid size-[76px] place-items-center rounded-full bg-accent text-accent-ink">
            <Icon name="mic" className="size-8" />
          </button>
        )}
      </span>
      <p className="font-mono text-sm text-muted">
        {listening ? t("elapsed", { elapsed: clock(elapsedMs), target }) : t("target", { target, max: clock(DICTATION_MAX_MS) })}
      </p>
    </div>
  );
}

/**
 * The expression step of the session: Write (a field) or Say (continuous recognition, a live transcript, no keyboard).
 * Moving to Write carries the transcript into the field and the production becomes a written one.
 */
export function ExpressionStep({ text, saving, mode, suggestSpoken, quota, onMode, onSubmit }: {
  text: Text;
  saving: boolean;
  /** The choice of the learner this session, or null before they made one. */
  mode: AnswerMode | null;
  suggestSpoken: boolean;
  quota: { used: number; limit: number };
  onMode(mode: AnswerMode): void;
  onSubmit(production: Production): void;
}) {
  const t = useTranslations("dailySession");
  const x = useTranslations("expression");
  const supported = useSpeechSupported();
  const dictation = useDictation(text.language);
  const privacy = useSpeechPrivacy();
  const [value, setValue] = useState("");
  const [start] = useState(Date.now);
  const current: AnswerMode = supported ? (mode ?? (suggestSpoken ? "say" : "write")) : "write";
  const minimum = PRODUCTION_MIN_WORDS[text.levelBand];

  function change(next: AnswerMode) {
    if (next === current) return;
    if (next === "write") {
      const heard = dictation.snapshot().trim();
      if (heard) setValue((previous) => (previous.trim() ? `${previous.trim()} ${heard}` : heard));
      dictation.clear();
    }
    onMode(next);
  }

  const switcher = supported && <SpeakSwitch mode={current} onChange={change} />;

  if (current === "write") {
    const words = countWords(text.language, value);
    return (
      <form className="space-y-5" onSubmit={(event) => {
        event.preventDefault();
        if (!saving && words >= minimum) onSubmit({ text: value.trim(), composeMs: Math.max(0, Date.now() - start) });
      }}>
        {switcher}
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

  const listening = dictation.status === "listening";
  const heard = dictation.transcript.trim();
  const words = countWords(text.language, heard);
  const review = !listening && heard !== "";
  const failure = dictation.error ?? (dictation.status === "unavailable" ? "failed" : null);
  const left = Math.max(0, quota.limit - quota.used);
  return (
    <div className="space-y-5">
      {switcher}
      <p className="sd-display text-2xl" lang={text.language} dir="auto">{text.writingTask}</p>
      {!listening && !review && <p className="text-muted">{x("sayHint")}</p>}
      {(listening || review) && (
        <div role={listening ? "status" : undefined} aria-live={listening ? "polite" : undefined} className="rounded-xl border border-line bg-surface p-4">
          <p className="meta">{listening ? x("heard") : x("understood", { duration: clock(dictation.elapsedMs) })}</p>
          <p className="mt-2 min-h-[1.5em] whitespace-pre-wrap break-words font-display text-[19px] leading-snug" lang={text.language} dir="auto">
            {dictation.transcript}
            {listening && <span aria-hidden="true" className="ms-0.5 inline-block h-5 w-0.5 translate-y-1 bg-accent-strong motion-safe:animate-pulse" />}
          </p>
        </div>
      )}
      {review && <p className="text-sm text-muted">{x("smoothing")}</p>}
      {review && <p className="text-muted" id="speaking-count">{t("wordCount", { words, minimum })}</p>}
      {dictation.reachedMax && !listening && <p className="text-sm text-muted" role="status">{x("maxReached")}</p>}
      {failure && <p className="text-sm text-muted" role="status">{x(failure === "denied" ? "denied" : failure === "no-speech" ? "noSpeech" : "failed")}</p>}
      {(listening || !review) && (
        <TimerMic
          listening={listening}
          elapsedMs={dictation.elapsedMs}
          label={x(listening ? "stop" : "start")}
          onPress={() => (listening ? dictation.stop() : privacy.ask(dictation.start))}
        />
      )}
      {review && (
        <div className="space-y-2">
          <Button disabled={saving || words < minimum} onClick={() => onSubmit({ text: heard, composeMs: Math.max(0, Date.now() - start), speakingMs: dictation.elapsedMs })}>
            {x("send")}
          </Button>
          {dictation.elapsedMs < DICTATION_MAX_MS && (
            <Button variant="secondary" className="w-full" onClick={() => privacy.ask(dictation.start)}>
              <Icon name="mic" className="size-5" />
              {x("resume")}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={dictation.clear}>
            <Icon name="repeat" className="size-5" />
            {x("redo")}
          </Button>
          <p className="text-center text-[13px] text-muted">{x("textOnly")} · {x("quota", { count: left })}</p>
        </div>
      )}
      {privacy.sheet}
    </div>
  );
}

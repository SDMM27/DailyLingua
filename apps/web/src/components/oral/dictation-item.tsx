"use client";

import { DICTATION_HIGH_ACCURACY, DICTATION_MIN_ACCURACY, gradeDictation, type AccentTolerance, type DictationGrade } from "@dailylingua/core";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ShellBody, ShellFooter } from "@/components/unit/unit-shell";
import { useClip } from "@/components/unit/use-clip";
import type { UnitEvent } from "@/lib/units/events";
import { dictationXp, oralAttemptEvent } from "@/lib/oral/session";
import type { OralPacketSentence } from "@/lib/oral/select-oral";
import { CharDiff } from "./char-diff";
import { ReplayButton, SLOW_RATE, SlowToggle } from "./oral-audio";

/**
 * Dictation: listen as often as wanted (slowly too), type what you hear, check. The comparison is by character (graded
 * here for the immediate feedback; the server grades again from the event, and pays a sentence once a day).
 */
export function DictationItem({ sentence, language, locale, tolerance, index, total, xpVisible, onEvent, onDone }: {
  sentence: OralPacketSentence;
  language: string;
  locale: "fr" | "en";
  tolerance: AccentTolerance;
  index: number;
  total: number;
  xpVisible: boolean;
  onEvent(event: UnitEvent): void;
  /** The accuracy of the dictation, 0 to 1. */
  onDone(accuracy: number): void;
}) {
  const t = useTranslations("oral.dictation");
  const session = useTranslations("dailySession");
  const unit = useTranslations("unit");
  const clip = useClip();
  const [value, setValue] = useState("");
  const [plays, setPlays] = useState(0);
  const [slow, setSlow] = useState(false);
  const [grade, setGrade] = useState<DictationGrade | null>(null);
  const shownAt = useRef(new Date().getTime());
  const typingAt = useRef<number | null>(null);
  const unavailable = clip.state === "unavailable";
  const ready = value.trim() !== "";

  function play() {
    setPlays((count) => count + 1);
    clip.play(sentence.audio, { rate: slow ? SLOW_RATE : 1 });
  }

  function change(next: string) {
    typingAt.current ??= Date.now();
    setValue(next);
  }

  function check() {
    if (!ready || grade) return;
    clip.stop();
    // `gradeDictation` takes the sentence as the learner will be shown it; the event carries only what was typed.
    setGrade(gradeDictation(language, sentence.text, value, tolerance));
    onEvent(oralAttemptEvent({ sentence, activity: "dictation", answer: value, recognizer: "none", selfRating: null, shownAt: shownAt.current, startedAt: typingAt.current ?? shownAt.current }));
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); check(); }} className="contents">
      <ShellBody>
        <div inert={grade !== null} className="flex flex-col gap-8 pt-7">
          <h1 className="meta text-lang">{t("instruction", { index, total })}</h1>
          <div className="flex items-center gap-3">
            <ReplayButton label={t("listen")} size={60} disabled={unavailable} onClick={play} />
            <p className="min-w-0 flex-1 text-sm text-muted">
              <b className="block text-base text-ink">{t("listen")}</b>
              {t("plays", { count: plays })}
            </p>
            <SlowToggle slow={slow} onToggle={() => setSlow((current) => !current)} />
          </div>
          {unavailable && <p role="status" className="text-sm text-muted">{unit("audioUnavailable")}</p>}
          <div>
            <textarea
              aria-label={t("field")}
              value={value}
              onChange={(event) => change(event.target.value)}
              rows={3}
              lang={language}
              dir="auto"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full resize-none rounded-xl border border-border-strong bg-surface p-3 font-display text-[18px] leading-snug"
            />
            <p className="mt-2 text-sm text-muted">{t("rules")}</p>
          </div>
        </div>
      </ShellBody>
      <ShellFooter>
        <Button type="submit" aria-disabled={!ready || grade !== null} onClick={(event) => { if (!ready) event.preventDefault(); }}>{session("check")}</Button>
      </ShellFooter>
      {grade && (
        <DictationFeedback sentence={sentence} language={language} locale={locale} grade={grade} xp={xpVisible ? dictationXp(grade.accuracy) : 0} onContinue={() => onDone(grade.accuracy)} />
      )}
    </form>
  );
}

/** The calm sheet after the check: a written verdict, the character diff, the model sentence. */
function DictationFeedback({ sentence, language, locale, grade, xp, onContinue }: {
  sentence: OralPacketSentence;
  language: string;
  locale: "fr" | "en";
  grade: DictationGrade;
  xp: number;
  onContinue(): void;
}) {
  const t = useTranslations("oral.dictation");
  const session = useTranslations("dailySession");
  const exercise = useTranslations("exercise");
  const high = grade.accuracy >= DICTATION_HIGH_ACCURACY;
  const passed = grade.accuracy >= DICTATION_MIN_ACCURACY;
  const length = grade.diff.filter((token) => token.status !== "extra").length;
  const correct = grade.diff.filter((token) => token.status === "ok").length;
  const clean = grade.diff.every((token) => token.status === "ok");
  return (
    <BottomSheet labelledBy="dictation-title" modal={false} tone="calm">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h2 id="dictation-title" data-sheet-title tabIndex={-1} className="flex items-center gap-2.5 font-display text-[22px] leading-tight font-bold">
          {passed ? <Icon name="check" className="size-[22px] text-success" /> : <Icon name="repeat" className="size-[22px] text-accent-strong" />}
          {high ? session("correct") : passed ? t("almost") : t("again")}
        </h2>
        {xp > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-3 py-1 font-mono text-base font-medium text-xp">
            <Icon name="xp" className="size-4" />
            {exercise("xp", { xp })}
          </span>
        )}
      </div>
      <div className="mt-3 max-h-[52dvh] overflow-y-auto">
        {!clean && <CharDiff language={language} diff={grade.diff} />}
        <p className="font-mono text-[13px] text-muted">{t("score", { correct, total: length, percent: Math.round(grade.accuracy * 100) })}</p>
        {!clean && <p className="mt-1 text-[13px] text-muted">{t("legend")}</p>}
        <p className="meta mt-4">{t("sentence")}</p>
        <p className="mt-1 font-display text-[19px] leading-snug" lang={language} dir="auto">{sentence.text}</p>
        <p className="mt-1 text-sm text-muted" lang={locale}>{sentence.translation}</p>
      </div>
      <div className="mt-4"><Button onClick={onContinue}>{session("continue")}</Button></div>
    </BottomSheet>
  );
}

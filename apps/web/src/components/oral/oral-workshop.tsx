"use client";

import type { AccentTolerance } from "@dailylingua/core";
import type { OralSelfRating } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { UnitShell } from "@/components/unit/unit-shell";
import { oralAttemptEvent, ORAL_MINUTES, summarize, type SaidResult } from "@/lib/oral/session";
import type { OralPacket } from "@/lib/oral/select-oral";
import type { UnitEvent } from "@/lib/units/events";
import { languageStyle } from "@/lib/units/language-style";
import { AnticipateItem } from "./anticipate-item";
import { DictationItem } from "./dictation-item";
import { OralEntry } from "./oral-entry";
import { OralResult } from "./oral-result";
import { RepeatItem, type RepeatOutcome } from "./repeat-item";

export interface OralWorkshopProps {
  packet: OralPacket;
  languageName: string;
  /** Titles of the units the sentences come from. */
  units: string[];
  locale: "fr" | "en";
  tolerance: AccentTolerance;
  xpVisible: boolean;
  offline: boolean;
  /** Hands events to the offline queue; a rejection shows a calm warning (the learner can go on). */
  onEvents(events: UnitEvent[]): Promise<void>;
  /** Whether the queue has delivered everything (asked again when the connection changes). */
  checkDelivery(): Promise<boolean>;
  onLeave(): void;
  roleplayCard?: ReactNode;
}

type Screen = { kind: "anticipate" | "repeat" | "dictation"; index: number };

/** Seconds between two checks of the delivery while the result is shown and something is still waiting. */
const DELIVERY_POLL_MS = 4000;

/**
 * « À voix haute », from its entry to its result: for each of the sentences to say, an anticipation then a repetition,
 * then the dictations. Everything is graded here for the immediate feedback (the content is in the packet, which also
 * works offline); the server grades again from the events and decides the XP. Close opens the pause sheet.
 */
export function OralWorkshop({ packet, languageName, units, locale, tolerance, xpVisible, offline, onEvents, checkDelivery, onLeave, roleplayCard }: OralWorkshopProps) {
  const t = useTranslations("oral");
  const unit = useTranslations("unit");
  const session = useTranslations("dailySession");
  const actions = useTranslations("common.actions");
  const [phase, setPhase] = useState<"entry" | "run" | "result">("entry");
  const [position, setPosition] = useState(0);
  const [said, setSaid] = useState<SaidResult[]>([]);
  const [dictated, setDictated] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [delivered, setDelivered] = useState(false);

  const { sentences, dictation, language } = packet;
  const screens = useMemo<Screen[]>(() => [
    ...sentences.flatMap((_, index): Screen[] => [{ kind: "anticipate", index }, { kind: "repeat", index }]),
    ...dictation.map((_, index): Screen => ({ kind: "dictation", index })),
  ], [sentences, dictation]);
  const itemCount = sentences.length + dictation.length;
  const distinct = useMemo(() => new Set([...sentences, ...dictation].map((sentence) => sentence.id)).size, [sentences, dictation]);
  const summary = useMemo(() => summarize(said, dictated), [said, dictated]);
  const style = languageStyle(language);

  // The writes in flight: the delivery is only checked once every event is in the queue.
  const writes = useRef<Promise<void>[]>([]);

  function emit(event: UnitEvent) {
    writes.current.push(onEvents([event]).catch(() => setSaveError(true)));
  }

  function next() {
    if (position + 1 >= screens.length) setPhase("result");
    else setPosition(position + 1);
  }

  function rate(index: number, rating: OralSelfRating, times: { shownAt: number; revealedAt: number }) {
    const sentence = sentences[index]!;
    emit(oralAttemptEvent({ sentence, activity: "anticipation", answer: "", recognizer: "none", selfRating: rating, shownAt: times.shownAt, startedAt: times.shownAt, endedAt: times.revealedAt + 1 }));
    setSaid((previous) => { const copy = [...previous]; copy[index] = { ...copy[index], anticipation: rating }; return copy; });
    next();
  }

  function repeated(index: number, outcome: RepeatOutcome) {
    setSaid((previous) => { const copy = [...previous]; copy[index] = { ...copy[index], repeat: outcome }; return copy; });
    next();
  }

  const checking = phase === "result";
  useEffect(() => {
    if (!checking) return;
    let live = true;
    const run = () => { Promise.allSettled(writes.current).then(checkDelivery).then((done) => { if (live && done) setDelivered(true); }).catch(() => undefined); };
    run();
    const timer = window.setInterval(run, DELIVERY_POLL_MS);
    return () => { live = false; window.clearInterval(timer); };
  }, [checking, offline, checkDelivery]);

  const warning = saveError && <p role="status" className="px-5 pt-2 text-sm text-muted">{unit("saveError")}</p>;

  if (phase === "entry") {
    return (
      <UnitShell style={style} onClose={onLeave} closeLabel={t("pause")}>
        <OralEntry languageName={languageName} minutes={ORAL_MINUTES} count={distinct} dictated={dictation.length} units={units} onStart={() => setPhase("run")} roleplayCard={roleplayCard} />
      </UnitShell>
    );
  }

  if (phase === "result") {
    return (
      <UnitShell style={style}>
        <OralResult summary={summary} xpVisible={xpVisible} delivered={delivered} count={distinct} onFinish={onLeave} />
      </UnitShell>
    );
  }

  const screen = screens[position]!;
  const labels = { anticipate: t("steps.anticipate"), repeat: t("steps.repeat"), dictation: t("steps.dictation") };
  const item = screen.kind === "dictation" ? sentences.length + screen.index + 1 : screen.index + 1;
  const bar = {
    steps: Array.from({ length: itemCount }, (_, index) => (index < sentences.length ? labels.anticipate : labels.dictation)),
    position: item,
    stepProgress: screen.kind === "repeat" ? 0.5 : 0,
    xp: xpVisible ? summary.xp : null,
    offline,
    label: labels[screen.kind],
  };
  const sentence = screen.kind === "dictation" ? dictation[screen.index]! : sentences[screen.index]!;
  const key = `${screen.kind}-${screen.index}`;

  return (
    <UnitShell style={style} bar={bar} onClose={() => setPaused(true)} closeLabel={t("pause")}>
      {warning}
      {screen.kind === "anticipate" ? (
        <AnticipateItem
          key={key}
          sentence={sentence}
          language={language}
          languageName={languageName}
          locale={locale}
          index={item}
          total={sentences.length}
          onRate={(rating, times) => rate(screen.index, rating, times)}
        />
      ) : screen.kind === "repeat" ? (
        <RepeatItem
          key={key}
          sentence={sentence}
          language={language}
          locale={locale}
          index={item}
          total={sentences.length}
          xpVisible={xpVisible}
          onEvent={emit}
          onDone={(outcome) => repeated(screen.index, outcome)}
        />
      ) : (
        <DictationItem
          key={key}
          sentence={sentence}
          language={language}
          locale={locale}
          tolerance={tolerance}
          index={screen.index + 1}
          total={dictation.length}
          xpVisible={xpVisible}
          onEvent={emit}
          onDone={(accuracy) => { setDictated((previous) => [...previous, accuracy]); next(); }}
        />
      )}
      {paused && (
        <BottomSheet labelledBy="pause-title" onClose={() => setPaused(false)}>
          <h2 id="pause-title" data-sheet-title tabIndex={-1} className="font-display text-[22px] leading-tight font-bold">{t("pauseTitle")}</h2>
          <p className="mt-2 text-muted">{t("pauseBody")}</p>
          <div className="mt-5 space-y-2.5">
            <Button onClick={() => setPaused(false)}>{actions("continue")}</Button>
            <Button variant="secondary" className="w-full" onClick={onLeave}>{session("leave")}</Button>
          </div>
        </BottomSheet>
      )}
    </UnitShell>
  );
}

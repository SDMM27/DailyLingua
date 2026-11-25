"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "@/components/unit/icons";
import { DeclaredChip, ReplayButton, SlowToggle } from "./oral-audio";

/** mm:ss of a duration. */
function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Time since it appeared: it is mounted only while the device listens, so it starts at zero by itself. */
function ListeningTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - start), 250);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="font-mono text-sm text-muted" aria-hidden="true">{clock(elapsed)}</span>;
}

/** Levels while the device listens: only a sign of life (no audio level is read), still under reduced motion. */
function Bars() {
  return (
    <span aria-hidden="true" className="flex h-6 items-center gap-1">
      {[10, 18, 24, 14, 20].map((height, index) => (
        <i key={index} style={{ height, animationDelay: `${index * 160}ms` }} className="w-[3px] rounded-full bg-accent-strong motion-safe:animate-pulse" />
      ))}
    </span>
  );
}

/**
 * The footer of the repetition: the « Lent » pill, the mic (76 px, `accent`, never the colour of the language) and the
 * replay. While the device listens the mic becomes a stop button ringed in `accent-strong`, with a slow outer ring that
 * stands still under reduced motion.
 */
export function OralPlayer({ listening, slow, canReplay, onSlow, onMic, onStop, onReplay }: {
  listening: boolean;
  slow: boolean;
  canReplay: boolean;
  onSlow(): void;
  onMic(): void;
  onStop(): void;
  onReplay(): void;
}) {
  const t = useTranslations("oral.repeat");
  return (
    <div className="px-4 pt-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="justify-self-start"><SlowToggle slow={slow} onToggle={onSlow} /></div>
        {listening ? (
          <span className="relative grid size-[76px] place-items-center">
            <span aria-hidden="true" className="absolute -inset-1.5 rounded-full border-2 border-accent-strong opacity-35 motion-safe:animate-pulse" />
            <button
              type="button"
              aria-label={t("stop")}
              onClick={onStop}
              className="relative grid size-[76px] place-items-center rounded-full bg-surface text-accent-strong shadow-[inset_0_0_0_3px_var(--sd-accent-strong)]"
            >
              <Icon name="stop" className="size-[22px]" />
            </button>
          </span>
        ) : (
          <button type="button" aria-label={t("mic")} onClick={onMic} className="grid size-[76px] place-items-center rounded-full bg-accent text-accent-ink">
            <Icon name="mic" className="size-8" />
          </button>
        )}
        <div className="justify-self-end">
          <button
            type="button"
            aria-disabled={!canReplay}
            onClick={() => { if (canReplay) onReplay(); }}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong px-3 text-sm font-semibold ${canReplay ? "" : "opacity-60"}`}
          >
            <Icon name="speaker" className="size-[18px] text-accent-strong" />
            {t("replay")}
          </button>
        </div>
      </div>
      <div role="status" className="mt-2 flex min-h-6 items-center justify-center gap-3 text-center text-sm text-muted">
        {listening ? (
          <>
            <Bars />
            <span>{t("listening")} {t("tapToStop")}</span>
            <ListeningTimer />
          </>
        ) : (
          t("idle")
        )}
      </div>
    </div>
  );
}

/** The self-rating footer of a repetition that nothing judges: replay the model, then « Proche » or « Pas encore ». */
export function SelfRatingFooter({ slow, canReplay, label, onSlow, onReplay, onRate }: {
  slow: boolean;
  canReplay: boolean;
  label: string;
  onSlow(): void;
  onReplay(): void;
  onRate(rating: "almost" | "not_yet"): void;
}) {
  const t = useTranslations("oral.repeat");
  return (
    <div className="px-5 pt-3">
      <div className="flex items-center gap-3">
        <ReplayButton label={label} disabled={!canReplay} onClick={onReplay} />
        <SlowToggle slow={slow} onToggle={onSlow} />
      </div>
      <div role="group" aria-label={t("closeQ")} className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onRate("almost")} className="min-h-[52px] rounded-xl border border-muted px-2 text-base font-semibold">{t("close")}</button>
        <button type="button" onClick={() => onRate("not_yet")} className="min-h-[52px] rounded-xl border border-muted px-2 text-base font-semibold">{t("notYet")}</button>
      </div>
      <p className="mt-3 flex justify-center"><DeclaredChip /></p>
    </div>
  );
}

"use client";

import type { Unit } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { segmentLine } from "@/lib/units/words";
import { Icon } from "./icons";
import { ShellBody, ShellFooter } from "./unit-shell";
import { TappableText, WordPanel, type PickedWord } from "./tappable-text";
import { useClip } from "./use-clip";

type Dialogue = Unit["dialogue"];
type Line = Dialogue["lines"][number];

const SLOW_RATE = 0.7;

/** What the parent remembers for the whole unit: the learner's choices about the display of the dialogue. */
export interface DialoguePrefs {
  translation: boolean;
  transliteration: boolean;
}

/**
 * Step 1: the dialogue, one line at a time (the two previous lines in grey, the current one large). Glossed words open
 * the word panel; the translation and the transliteration (when the unit has one) are behind a tap; the player at the
 * bottom reads the line, slowly if asked, or the whole dialogue. The step ends when the last line has been shown.
 */
export function DialogueStep({ language, locale, dialogue, prefs, onPrefs, onFinished }: {
  language: string;
  locale: "fr" | "en";
  dialogue: Dialogue;
  prefs: DialoguePrefs;
  onPrefs(next: DialoguePrefs): void;
  /** Called by the « Continuer » that appears once the last line has been shown. */
  onFinished(): void;
}) {
  const t = useTranslations("dialogue");
  const reader = useTranslations("reader");
  const common = useTranslations("common.actions");
  const clip = useClip();
  const [index, setIndex] = useState(0);
  const [reached, setReached] = useState(0);
  const [slow, setSlow] = useState(false);
  const [all, setAll] = useState(false);
  const [picked, setPicked] = useState<PickedWord | null>(null);
  const [transcript, setTranscript] = useState(false);

  const lines = dialogue.lines;
  const line = lines[index]!;
  const speakers = useMemo(() => new Map(dialogue.speakers.map((speaker) => [speaker.id, speaker.name])), [dialogue.speakers]);
  const hasTransliteration = lines.some((entry) => entry.transliteration);
  const rate = slow ? SLOW_RATE : 1;
  const rateLabel = slow ? "0,7×" : "1×";
  const unavailable = clip.state === "unavailable";
  const pending = line.audio === null;
  const canPlay = !pending && !unavailable;
  const last = index === lines.length - 1;

  function show(next: number) {
    setIndex(next);
    setReached((value) => Math.max(value, next));
    setPicked(null);
  }

  function playLine(at: number, chain: boolean) {
    const target = lines[at]!;
    if (!target.audio) return;
    clip.play(target.audio, {
      rate,
      onEnded: chain && at + 1 < lines.length ? () => { show(at + 1); playLine(at + 1, true); } : () => setAll(false),
    });
  }

  function toggleAll() {
    if (all) {
      clip.stop();
      setAll(false);
      return;
    }
    if (!lines[0]?.audio) return;
    setAll(true);
    show(0);
    playLine(0, true);
  }

  function move(next: number) {
    clip.stop();
    setAll(false);
    show(next);
  }

  const playing = clip.state === "playing";
  const note = unavailable ? t("audioUnavailable") : pending ? reader("audioPending") : null;

  return (
    <>
      <ShellBody>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-3">
          <p className="meta min-w-0" lang={language}>{t("position", { title: dialogue.title, line: index + 1, total: lines.length })}</p>
          <button type="button" onClick={() => setTranscript(true)} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 text-sm font-semibold">
            <Icon name="list" className="size-[18px]" />
            {t("transcript")}
          </button>
        </div>
        {index > 0 && (
          <ol aria-label={t("previousLines")} className="grid gap-3">
            {lines.slice(Math.max(0, index - 2), index).map((previous) => (
              <li key={previous.id} className="text-muted">
                <p className="text-xs font-semibold">{speakers.get(previous.speaker)}</p>
                <p className="font-display text-[17px] leading-snug" lang={language} dir="auto">
                  <TappableText segments={segmentLine(previous.text, dialogue.glosses)} context={previous.id} selected={picked?.context ?? null} muted onWord={setPicked} />
                </p>
              </li>
            ))}
          </ol>
        )}
        <div key={line.id}>
          <p className="meta text-lang">{speakers.get(line.speaker)}</p>
          <p className="mt-1.5 font-display text-[30px] leading-[1.35] tracking-tight" lang={language} dir="auto">
            <TappableText segments={segmentLine(line.text, dialogue.glosses)} context={line.id} selected={picked?.context ?? null} onWord={setPicked} />
          </p>
          {prefs.transliteration && line.transliteration && (
            <p className="mt-2 text-[17px] text-muted" lang={`${language}-Latn`}>{line.transliteration}</p>
          )}
          {prefs.translation && <p className="mt-2 text-[17px] text-muted" lang={locale}>{line.translation[locale]}</p>}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3">
            <button
              type="button"
              aria-label={t("replay")}
              aria-disabled={!canPlay}
              onClick={() => canPlay && playLine(index, false)}
              className={`grid size-[52px] place-items-center rounded-full text-accent-strong shadow-[inset_0_0_0_1.5px_var(--sd-border-strong)] ${canPlay ? "" : "opacity-60"}`}
            >
              <Icon name="speaker" />
            </button>
            <button type="button" aria-pressed={prefs.translation} onClick={() => onPrefs({ ...prefs, translation: !prefs.translation })} className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-accent-strong underline decoration-1 underline-offset-4">
              {t(prefs.translation ? "hideTranslation" : "showTranslation")}
            </button>
            {hasTransliteration && (
              <button type="button" aria-pressed={prefs.transliteration} onClick={() => onPrefs({ ...prefs, transliteration: !prefs.transliteration })} className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-accent-strong underline decoration-1 underline-offset-4">
                {t(prefs.transliteration ? "hideTransliteration" : "showTransliteration")}
              </button>
            )}
          </div>
        </div>
      </div>

      </ShellBody>
      <ShellFooter className="px-0 pt-0">
        {picked && !transcript && (
          <div className="absolute inset-x-3 bottom-full mb-2">
            <WordPanel picked={picked} language={language} locale={locale} line={lines.find((entry) => picked.context.startsWith(`${entry.id}\u0000`))?.text ?? picked.context} onClose={() => setPicked(null)} />
          </div>
        )}
        {reached >= lines.length - 1 && last && (
          <div className="px-5 pt-3"><Button onClick={onFinished}>{common("continue")}</Button></div>
        )}
        <div role="group" aria-label={t("player")} className="px-4 pt-2">
          <div className="flex items-center justify-between gap-1">
            <button type="button" aria-pressed={slow} aria-label={t("slowA11y", { rate: rateLabel })} onClick={() => setSlow((value) => !value)} className={`grid min-h-12 min-w-14 justify-items-center rounded-xl px-1 text-xs font-semibold ${slow ? "bg-accent-soft text-accent-strong" : "text-muted"}`}>
              <span className="font-mono text-[13px] leading-[22px] text-ink">{rateLabel}</span>
              {t("slow")}
            </button>
            <button type="button" aria-label={t("previous")} disabled={index === 0} onClick={() => move(index - 1)} className="grid size-11 place-items-center rounded-full disabled:opacity-40">
              <Icon name="prev" />
            </button>
            <button
              type="button"
              aria-label={playing ? t("pause") : t("play", { line: index + 1 })}
              aria-disabled={!canPlay}
              onClick={() => {
                if (!canPlay) return;
                if (playing) { clip.stop(); setAll(false); } else playLine(index, false);
              }}
              className={`grid size-14 place-items-center rounded-full bg-accent text-accent-ink ${canPlay ? "" : "opacity-60"}`}
            >
              <Icon name={playing ? "pause" : "play"} />
            </button>
            <button type="button" aria-label={t("next")} disabled={last} onClick={() => move(index + 1)} className="grid size-11 place-items-center rounded-full disabled:opacity-40">
              <Icon name="next" />
            </button>
            <button type="button" aria-pressed={all} aria-label={t("allA11y")} aria-disabled={!lines[0]?.audio || unavailable} onClick={toggleAll} className={`grid min-h-12 min-w-14 justify-items-center rounded-xl px-1 text-xs font-semibold ${all ? "bg-accent-soft text-accent-strong" : "text-muted"}`}>
              <Icon name="repeat" className="size-[22px] text-ink" />
              {t("all")}
            </button>
          </div>
          {note && <p role="status" className="px-1 pt-1 text-center text-sm text-muted">{note}</p>}
        </div>
      </ShellFooter>

      {transcript && (
        <TranscriptSheet
          language={language}
          locale={locale}
          dialogue={dialogue}
          showTranslation={prefs.translation}
          picked={picked}
          onPick={setPicked}
          onClose={() => { setTranscript(false); setPicked(null); }}
        />
      )}
    </>
  );
}

/** « Tout le texte »: the whole dialogue, every line with its audio and touchable words. */
function TranscriptSheet({ language, locale, dialogue, showTranslation, picked, onPick, onClose }: {
  language: string;
  locale: "fr" | "en";
  dialogue: Dialogue;
  showTranslation: boolean;
  picked: PickedWord | null;
  onPick(word: PickedWord | null): void;
  onClose(): void;
}) {
  const t = useTranslations("dialogue");
  const actions = useTranslations("common.actions");
  const clip = useClip();
  const speakers = new Map(dialogue.speakers.map((speaker) => [speaker.id, speaker.name]));
  return (
    <BottomSheet labelledBy="transcript-title" onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="transcript-title" data-sheet-title tabIndex={-1} className="font-display text-[22px] leading-tight font-bold">{t("transcriptTitle")}</h2>
        <button type="button" aria-label={actions("close")} onClick={onClose} className="grid size-11 place-items-center rounded-full">
          <Icon name="close" />
        </button>
      </div>
      <ol className="mt-3 grid max-h-[55dvh] gap-4 overflow-y-auto pe-1">
        {dialogue.lines.map((line: Line) => (
          <li key={line.id} className="flex items-start gap-3">
            <button
              type="button"
              aria-label={t("play", { line: dialogue.lines.indexOf(line) + 1 })}
              aria-disabled={line.audio === null || clip.state === "unavailable"}
              onClick={() => line.audio && clip.state !== "unavailable" && clip.play(line.audio)}
              className={`grid size-11 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1.5px_var(--sd-border-strong)] ${line.audio ? "" : "opacity-60"}`}
            >
              <Icon name="speaker" className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">{speakers.get(line.speaker)}</p>
              <p className="font-display text-lg leading-snug" lang={language} dir="auto">
                <TappableText segments={segmentLine(line.text, dialogue.glosses)} context={line.id} selected={picked?.context ?? null} onWord={onPick} />
              </p>
              {showTranslation && <p className="text-sm text-muted" lang={locale}>{line.translation[locale]}</p>}
            </div>
          </li>
        ))}
      </ol>
      {picked && (
        <div className="mt-3">
          <WordPanel picked={picked} language={language} locale={locale} line={dialogue.lines.find((entry) => picked.context.startsWith(`${entry.id}\u0000`))?.text ?? ""} onClose={() => onPick(null)} />
        </div>
      )}
    </BottomSheet>
  );
}

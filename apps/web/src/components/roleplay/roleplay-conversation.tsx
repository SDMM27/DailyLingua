"use client";

import { MAX_ROLEPLAY_TURN_CHARS, MAX_ROLEPLAY_TURNS, type RoleplayGame, type RoleplayScenario, type RoleplayTurnRequest } from "@dailylingua/schemas";
import type { UiLocale } from "@dailylingua/i18n";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSpeechPrivacy } from "@/components/today/speech-privacy";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ShellBody, ShellFooter } from "@/components/unit/unit-shell";
import { useRecognition } from "@/lib/speech/use-recognition";
import type { useRoleplayVoice } from "./roleplay-voice";

export function RoleplayConversation({ game, scenario, locale, voice, pending, online, feedback, onTurn, onFinish }: {
  game: RoleplayGame;
  scenario: RoleplayScenario;
  locale: UiLocale;
  voice: ReturnType<typeof useRoleplayVoice>;
  pending: boolean;
  online: boolean;
  feedback: ReactNode;
  onTurn(request: RoleplayTurnRequest): Promise<boolean>;
  onFinish(): void;
}) {
  const t = useTranslations("roleplay");
  const [draft, setDraft] = useState<RoleplayTurnRequest>({ text: "", via: "typed" });
  const [translations, setTranslations] = useState<Set<number>>(() => new Set());
  const last = useRef<HTMLLIElement>(null);
  const speech = useRecognition(game.language, {
    onFinal: (text) => setDraft({ text: text.slice(0, MAX_ROLEPLAY_TURN_CHARS), via: "speech" }),
  });
  const privacy = useSpeechPrivacy();

  const listening = speech.status === "listening";
  const locked = pending || !online;
  const text = listening ? speech.transcript.slice(0, MAX_ROLEPLAY_TURN_CHARS) : draft.text;
  useEffect(() => {
    if (game.turns.length > 1) last.current?.scrollIntoView({ block: "nearest" });
  }, [game.turns.length]);

  async function send() {
    if (!draft.text.trim() || locked || listening) return;
    if (await onTurn({ ...draft, text: draft.text.trim() })) {
      setDraft({ text: "", via: "typed" });
      speech.reset();
    }
  }

  function toggleTranslation(index: number) {
    setTranslations((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <>
      <header className="shrink-0 border-b border-line px-5 pb-3">
        <h1 className="font-display text-[26px] leading-tight font-bold">{scenario.title[locale]}</h1>
        <p className="mt-1 font-mono text-sm text-muted">{t("turnCount", { count: game.learnerTurns, total: MAX_ROLEPLAY_TURNS })}</p>
        <ul aria-label={t("objectives")} className="mt-2 grid gap-1.5 text-sm">
          {scenario.objectives.map((objective, index) => (
            <li key={objective[locale]} className="flex items-start gap-2">
              <Icon name={game.objectivesMet[index] ? "check" : "ring"} className="mt-0.5 size-4 text-accent-strong" />
              <span><span className="sr-only">{t(game.objectivesMet[index] ? "met" : "unmet")}. </span>{objective[locale]}</span>
            </li>
          ))}
        </ul>
      </header>
      <ShellBody>
        <ol aria-label={t("conversation")} aria-live="polite" className="grid gap-3">
          {game.turns.map((turn, index) => (
            <li
              key={index}
              ref={index === game.turns.length - 1 ? last : undefined}
              className={`w-fit max-w-[90%] min-w-0 rounded-card border border-line px-3 py-2 break-words ${turn.role === "ai" ? "bg-surface" : "justify-self-end bg-surface-2"}`}
            >
              <span className="sr-only">{turn.role === "ai" ? scenario.aiRole[locale] : t("you")}</span>
              <p lang={game.language} dir="auto">{turn.text}</p>
              {turn.role === "ai" && (
                <>
                  <div className="flex flex-wrap gap-1">
                    {turn.translation && (
                      <Button variant="ghost" className="px-2 text-sm" aria-expanded={translations.has(index)} onClick={() => toggleTranslation(index)}>
                        {t("translate")}
                      </Button>
                    )}
                    {voice.available && (
                      <Button variant="ghost" className="size-11 px-0" aria-label={t("speak")} disabled={listening} onClick={() => voice.speak(turn.text)}>
                        <Icon name="speaker" className="size-5" />
                      </Button>
                    )}
                  </div>
                  {translations.has(index) && <p dir="auto" className="border-t border-line pt-2 text-sm text-muted">{turn.translation}</p>}
                </>
              )}
            </li>
          ))}
        </ol>
        {voice.available && (
          <label className="mt-2 flex min-h-11 w-fit items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="size-4 accent-accent" checked={voice.auto} onChange={(event) => voice.changeAuto(event.target.checked)} />
            {t("autoSpeak")}
          </label>
        )}
      </ShellBody>
      <ShellFooter>
        {feedback}
        {game.turnsLeft > 0 ? (
          <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <div className="flex items-start gap-2">
              <label className="sr-only" htmlFor="roleplay-draft">{t("message")}</label>
              <textarea
                id="roleplay-draft"
                dir="auto"
                lang={game.language}
                rows={2}
                value={text}
                maxLength={MAX_ROLEPLAY_TURN_CHARS}
                readOnly={listening}
                disabled={pending}
                placeholder={t("message")}
                className="w-full min-w-0 resize-none rounded-xl border border-muted bg-bg p-2.5 text-base text-ink"
                onChange={(event) => setDraft({ text: event.target.value, via: "typed" })}
              />
              {speech.status !== "unavailable" && speech.error !== "denied" && (
                <Button variant="secondary" className="size-11 shrink-0 px-0 text-accent-strong" aria-label={t(listening ? "stopMicrophone" : "microphone")} disabled={locked}
                  onClick={() => {
                    if (listening) speech.stop();
                    else privacy.ask(() => { voice.stop(); speech.start(); });
                  }}>
                  <Icon name={listening ? "stop" : "mic"} className="size-5" />
                </Button>
              )}
            </div>
            {speech.status === "error" && <p role="status" className="py-1 text-sm text-muted">{t("microphoneError")}</p>}
            <div className="mt-2 flex gap-2">
              <Button type="submit" className="min-w-0 flex-1" disabled={locked || listening || !draft.text.trim()}>{t("send")}</Button>
              <Button variant="ghost" disabled={locked || listening} onClick={onFinish}>{t("finish")}</Button>
            </div>
          </form>
        ) : <Button disabled={locked} onClick={onFinish}>{t("viewReview")}</Button>}
      </ShellFooter>
      {privacy.sheet}
    </>
  );
}

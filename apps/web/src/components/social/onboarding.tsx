"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { activateSocial } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, FormMessage } from "@/components/ui/field";
import { useSocialAction } from "./use-social-action";

const PSEUDONYM = /^[\p{L}\p{N}][\p{L}\p{N} -]{2,19}$/u;

/** First visit: step 1 explains and takes the pseudonym, step 2 offers the two opt-ins (or "Skip, later"). Nothing is on by default. */
export function Onboarding() {
  const t = useTranslations("social.onboarding");
  const inputId = useId();
  const hintId = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [pseudonym, setPseudonym] = useState("");
  const [league, setLeague] = useState(false);
  const [friends, setFriends] = useState(false);
  const [problem, setProblem] = useState<"invalid" | "taken" | "rate_limited" | null>(null);
  const { run, pending, failed } = useSocialAction();
  const clean = pseudonym.trim();

  function finish() {
    run(() => activateSocial({ pseudonym: clean, league, friends }), (result) => {
      if (result.status === "taken") {
        setProblem("taken");
        setStep(1);
      } else if (result.status === "invalid" || result.status === "rate_limited") {
        setProblem(result.status);
        setStep(1);
      }
    });
  }

  const choices = [
    { key: "league", on: league, toggle: () => setLeague(!league), title: t("leagueTitle"), body: t("leagueBody") },
    { key: "friends", on: friends, toggle: () => setFriends(!friends), title: t("friendsTitle"), body: t("friendsBody") },
  ];

  return (
    <div className="space-y-8">
      <div className="flex gap-1.5" role="img" aria-label={t("step", { step })}>
        <i className="h-1 flex-1 rounded-full bg-accent" />
        <i className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-accent" : "bg-line"}`} />
      </div>
      {step === 1 ? (
        <>
          <header className="space-y-3">
            <h1 className="sd-display text-3xl">{t("title1")}</h1>
            <p className="text-muted">{t("body1")}</p>
          </header>
          <ul className="space-y-3">
            {[t("noRanking"), t("noNotifications"), t("noName")].map((point) => (
              <li key={point} className="rounded-card border border-line bg-surface px-5 py-4">{point}</li>
            ))}
          </ul>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (PSEUDONYM.test(clean)) { setProblem(null); setStep(2); } else setProblem("invalid"); }}>
            <div className="space-y-2">
              <label htmlFor={inputId} className="block text-sm font-semibold">{t("pseudonymLabel")}</label>
              <input id={inputId} type="text" maxLength={20} autoComplete="off" value={pseudonym} aria-invalid={problem !== null} aria-describedby={hintId}
                onChange={(event) => { setPseudonym(event.target.value); setProblem(null); }} className={CONTROL_CLASS} />
              <p id={hintId} className="text-sm text-muted">{t("pseudonymHint")}</p>
            </div>
            {problem && <FormMessage kind="error">{t(problem)}</FormMessage>}
            <Button type="submit" disabled={clean.length < 3}>{t("continue")}</Button>
          </form>
        </>
      ) : (
        <>
          <header className="space-y-3">
            <h1 className="sd-display text-3xl">{t("title2")}</h1>
            <p className="text-muted">{t("body2")}</p>
          </header>
          <div className="space-y-3">
            {choices.map((choice) => (
              <button key={choice.key} type="button" aria-pressed={choice.on} onClick={choice.toggle}
                className={`flex min-h-[72px] w-full items-center gap-4 rounded-card border-2 px-5 py-4 text-start ${choice.on ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
                <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 font-bold ${choice.on ? "border-accent bg-accent text-accent-ink" : "border-border-strong"}`}>{choice.on ? "✓" : ""}</span>
                <span><b className="block">{choice.title}</b><span className="text-sm text-muted">{choice.body}</span></span>
              </button>
            ))}
          </div>
          {failed && <FormMessage kind="error">{t("invalid")}</FormMessage>}
          <Button disabled={pending} onClick={finish}>{league || friends ? t("finish") : t("later")}</Button>
        </>
      )}
    </div>
  );
}

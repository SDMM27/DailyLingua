"use client";

import type { UiLocale } from "@dailylingua/i18n";
import type { RoleplayGame, RoleplayReview, RoleplayScenario } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ShellBody, ShellFooter } from "@/components/unit/unit-shell";

export function RoleplayResult({ game, review, scenario, locale, backHref, xp, pending, onChoose }: {
  game: RoleplayGame;
  review: RoleplayReview;
  scenario: RoleplayScenario;
  locale: UiLocale;
  backHref: string;
  xp: number;
  pending: boolean;
  onChoose?(): void;
}) {
  const t = useTranslations("roleplay");
  const notes = [
    { title: t("corrections"), entries: review.errors.map(({ original, corrected, explanation }) => ({ original, suggestion: corrected, explanation })) },
    { title: t("phrasings"), entries: review.betterPhrasings.map(({ original, natural, explanation }) => ({ original, suggestion: natural, explanation })) },
  ];
  return (
    <>
      <ShellBody>
        <div className="space-y-6 border-y-4 border-double border-line py-5">
          <div>
            <p className="meta">{scenario.title[locale]}</p>
            <h1 className="mt-1 font-display text-[30px] leading-tight font-bold">{t("result")}</h1>
            {xp > 0 && <p role="status" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-3 py-1 font-mono text-xp"><Icon name="xp" className="size-4" />{t("xp", { xp })}</p>}
            {pending && <p role="status" className="mt-2 text-sm text-muted">{t("xpPending")}</p>}
          </div>
          <section>
            <h2 className="font-display text-xl font-bold">{t("objectives")}</h2>
            <ul className="mt-2 space-y-2">
              {review.objectives.map(({ met, comment }, index) => (
                <li key={index} className="flex items-start gap-2 border-t border-line pt-2">
                  <Icon name={met ? "check" : "ring"} className="mt-1 size-4 text-accent-strong" />
                  <div className="min-w-0">
                    <div className="font-semibold"><span className="sr-only">{t(met ? "met" : "unmet")}. </span>{scenario.objectives[index]?.[locale]}</div>
                    {comment && <p dir="auto" className="text-sm text-muted">{comment}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {notes.filter(({ entries }) => entries.length > 0).map(({ title, entries }) => (
            <section key={title}>
              <h2 className="font-display text-xl font-bold">{title}</h2>
              <ul className="mt-2 space-y-2">
                {entries.map(({ original, suggestion, explanation }, index) => (
                  <li key={index} className="space-y-0.5 border-t border-line pt-2 break-words">
                    <p lang={game.language} dir="auto" className="text-muted">{original}</p>
                    <p lang={game.language} dir="auto" className="font-semibold">{suggestion}</p>
                    {explanation && <p dir="auto" className="text-sm text-muted">{explanation}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ShellBody>
      <ShellFooter>
        {onChoose && <Button onClick={onChoose}>{t("changeScenario")}</Button>}
        <Link className={onChoose ? `${buttonClass("ghost")} w-full` : buttonClass()} href={backHref}>{t("back")}</Link>
      </ShellFooter>
    </>
  );
}

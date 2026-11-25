"use client";

import { isTargetLanguage, languageInfo, type OralToken } from "@dailylingua/core";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

/** How a word that was not said right is drawn: the shape carries the meaning, never only the colour. */
const MARKS = {
  missing: "text-error underline decoration-dotted decoration-2 underline-offset-4",
  wrong: "text-error underline decoration-wavy decoration-2 underline-offset-4",
} as const;

const MAX_ROWS = 3;

/**
 * The model sentence with what the device did not hear marked: a word left out is dotted, a word heard as another is
 * wavy. Words the learner added are not in the model: they only show in the « Ton téléphone a compris » line. Up to
 * three rows say which words, and how.
 */
export function WordDiff({ language, tokens, transcript }: { language: string; tokens: OralToken[]; transcript: string }) {
  const t = useTranslations("oral.repeat");
  const model = tokens.filter((token) => token.status !== "extra");
  const problems = model.filter((token) => token.status === "missing" || token.status === "wrong");
  // Where words are not separated by spaces (Chinese, Japanese) the tokens are characters and are drawn joined.
  const gap = isTargetLanguage(language) && languageInfo(language).unspaced ? "" : " ";
  return (
    <div className="grid gap-3">
      <p className="font-display text-[21px] leading-snug" lang={language} dir="auto">
        {model.map((token, index) => (
          <Fragment key={index}>
            {index > 0 && gap}
            <span className={token.status === "ok" ? undefined : MARKS[token.status as "missing" | "wrong"]}>
              {token.text}
              {token.status !== "ok" && <span className="sr-only"> ({t(token.status === "missing" ? "missing" : "substituted")})</span>}
            </span>
          </Fragment>
        ))}
      </p>
      <p className="text-sm text-muted">{t("heard", { text: transcript })}</p>
      {problems.length > 0 && (
        <ul className="grid gap-1">
          {problems.slice(0, MAX_ROWS).map((token, index) => (
            <li key={index} className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
              <b className="font-display text-base font-semibold text-error" lang={language} dir="auto">{token.text}</b>
              {t(token.status === "missing" ? "missing" : "substituted")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import type { OralToken } from "@dailylingua/core";

/** How a character of a dictation is drawn: shape carries the meaning, never only the colour. */
const MARKS = {
  missing: "text-error underline decoration-dotted decoration-2 underline-offset-[6px]",
  wrong: "text-error underline decoration-wavy decoration-2 underline-offset-[6px]",
  extra: "text-error line-through decoration-2",
} as const;

/**
 * The model sentence, character by character, against what was typed: a character left out is dotted, one typed wrong
 * is wavy (the right one is shown), one typed in addition is struck through. The key to the marks is written under it.
 */
export function CharDiff({ language, diff }: { language: string; diff: OralToken[] }) {
  return (
    <p className="font-display text-[23px] leading-[2] whitespace-pre-wrap" lang={language} dir="auto">
      {diff.map((token, index) => (
        <span key={index} className={token.status === "ok" ? undefined : MARKS[token.status]}>{token.text}</span>
      ))}
    </p>
  );
}

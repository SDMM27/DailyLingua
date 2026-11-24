"use client";

import type { ScriptUnit, UnitStep } from "@dailylingua/schemas";
import { LettersStep } from "./letters-step";
import { WordsStep } from "./words-step";

/** The steps of a writing unit that open on a screen of their own before their items (the others are items only). */
export function scriptHasInfo(step: UnitStep): boolean {
  return step === "letters" || step === "words";
}

/** The information screen of a writing-unit step: the letters one by one, or the readable words. */
export function ScriptInfo({ unit, step, locale, onFinished }: { unit: ScriptUnit; step: UnitStep; locale: "fr" | "en"; onFinished(): void }) {
  if (step === "letters") return <LettersStep key="letters" unit={unit} locale={locale} onFinished={onFinished} />;
  if (step === "words") return <WordsStep key="words" unit={unit} locale={locale} onFinished={onFinished} />;
  return null;
}

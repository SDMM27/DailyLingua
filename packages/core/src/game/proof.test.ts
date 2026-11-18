import { describe, expect, it } from "vitest";
import { allStepsValidated, emptyReadingEvidence, expressionValidated, momentumValidated, readingDurationMs, readingValidated, wakeValidated, workshopValidated } from "./index";

describe("step proofs", () => {
  it("validates the Réveil when every card was tried, 90 % of the budget was spent, or nothing was due", () => {
    expect(wakeValidated([], 3, { answered: [], ms: 0 })).toBe(true);
    expect(wakeValidated(["a", "b"], 3, { answered: ["a", "b", "x"], ms: 1000 })).toBe(true);
    expect(wakeValidated(["a", "b"], 3, { answered: ["a"], ms: 1000 })).toBe(false);
    expect(wakeValidated(["a", "b"], 3, { answered: ["a"], ms: 162_000 })).toBe(true);
    expect(wakeValidated(["a", "b"], 3, { answered: ["a"], ms: 161_999 })).toBe(false);
  });

  it("validates the reading on reaching the end, at no more than 400 wpm, with 3 answers, whatever the score", () => {
    const ok = { maxRatio: 1, startedMs: 0, endedMs: 45_000, answers: { a: false, b: false, c: false } };
    expect(readingDurationMs(ok)).toBe(45_000);
    expect(readingValidated(300, ok)).toBe(true);
    expect(readingValidated(300, { ...ok, endedMs: 44_000 })).toBe(false);
    expect(readingValidated(300, { ...ok, maxRatio: 0.75 })).toBe(false);
    expect(readingValidated(300, { ...ok, answers: { a: true, b: true } })).toBe(false);
    expect(readingValidated(300, emptyReadingEvidence())).toBe(false);
  });

  it("validates the workshop when every item has an attempt", () => {
    expect(workshopValidated(["a", "b"], ["b", "a"])).toBe(true);
    expect(workshopValidated(["a", "b"], ["a"])).toBe(false);
  });

  it("validates the expression on an accepted production and, when errors were found, a verified rewrite", () => {
    const base = { accepted: true, correctionReceived: true, correctionDeferred: false, hasErrors: true, verifiedRewrites: 0 };
    expect(expressionValidated(base)).toBe(false);
    expect(expressionValidated({ ...base, verifiedRewrites: 1 })).toBe(true);
    expect(expressionValidated({ ...base, hasErrors: false })).toBe(true);
    expect(expressionValidated({ ...base, correctionReceived: false })).toBe(false);
    expect(expressionValidated({ ...base, correctionReceived: false, correctionDeferred: true })).toBe(true);
    expect(expressionValidated({ ...base, accepted: false, verifiedRewrites: 2 })).toBe(false);
  });

  it("validates the momentum on a pass of 10 s or more at 400 wpm or less", () => {
    expect(momentumValidated({ durationMs: 60_000, words: 180 })).toBe(true);
    expect(momentumValidated({ durationMs: 9_000, words: 10 })).toBe(false);
    expect(momentumValidated({ durationMs: 20_000, words: 180 })).toBe(false);
  });

  it("completes a session when every required step is validated", () => {
    expect(allStepsValidated(["wake", "reading"], ["reading", "wake", "momentum"])).toBe(true);
    expect(allStepsValidated(["wake", "reading"], ["wake"])).toBe(false);
  });
});

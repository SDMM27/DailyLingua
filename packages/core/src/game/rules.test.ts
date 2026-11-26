import { xpRuleIds } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import {
  COUNT_CAPS,
  DAILY_CAPS,
  RULE_VOLET,
  RULE_XP,
  SQL_DAILY_XP_BOUND,
  THEORETICAL_DAILY_MAX,
  capCount,
  capFocus,
  capOral,
  capReading,
  dictationSentence,
  shadowingSentence,
  capReview,
  capRewrite,
  errorOfDayReworked,
  fluencyPass,
  focusFirstTry,
  focusSecondTry,
  minReadingMs,
  passWpm,
  productionCorrected,
  productionRejection,
  readingUnderstood,
  reviewBonusDifficulty,
  reviewBonusReconquest,
  reviewListening,
  reviewOutcome,
  reviewProduction,
  reviewRecognition,
  rewriteSentence,
  sessionComplete,
  unitComplete,
  type ReviewProof,
} from "./index";

const review = (extra: Partial<ReviewProof> = {}): ReviewProof => ({
  correct: true,
  due: true,
  elapsedMs: 3000,
  alreadyCountedToday: false,
  audioPlays: 1,
  ...extra,
});

describe("the scale", () => {
  it("has a value and a strand for every rule of the spec", () => {
    expect(Object.keys(RULE_XP).sort()).toEqual([...xpRuleIds].sort());
    expect(Object.keys(RULE_VOLET).sort()).toEqual([...xpRuleIds].sort());
    expect(RULE_XP["session.complete"]).toBe(10);
    expect(RULE_VOLET["session.complete"]).toBeNull();
    expect(RULE_VOLET["fluency.pass"]).toBe("fluency");
  });

  it("adds up to the theoretical maximum of 446 XP a day, under the SQL bound of 500", () => {
    const { review: r, input, focusPerDay, productions, rewriteXp, errorOfDay, fluencyPasses, sessionComplete: s, unitComplete: u, shadowing, dictation } = DAILY_CAPS;
    const total = r + input + focusPerDay + productions * RULE_XP["production.corrected"] + rewriteXp + errorOfDay * RULE_XP["error_of_day.reworked"] + fluencyPasses * RULE_XP["fluency.pass"] + s * RULE_XP["session.complete"] + u * RULE_XP["unit.complete"] + shadowing + dictation;
    expect(total).toBe(THEORETICAL_DAILY_MAX);
    expect(THEORETICAL_DAILY_MAX).toBeLessThanOrEqual(SQL_DAILY_XP_BOUND);
  });

  it("pays 25 XP for a unit passed the first time, nothing again, and no strand", () => {
    expect(unitComplete({ passed: true, alreadyPassed: false })).toMatchObject({ rule: "unit.complete", amount: 25, volet: null, zero: null });
    expect(unitComplete({ passed: true, alreadyPassed: true })).toMatchObject({ amount: 0, zero: "already_earned" });
    expect(unitComplete({ passed: false, alreadyPassed: false })).toMatchObject({ amount: 0, zero: null });
    expect(COUNT_CAPS["unit.complete"]).toBe(2);
  });
});

describe("review rules", () => {
  it("pays 1, 2 and 2 XP for recognition, production and listening", () => {
    expect(reviewRecognition(review())).toMatchObject({ rule: "review.recognition", amount: 1, volet: "study", zero: null });
    expect(reviewProduction(review({ elapsedMs: 1000 }))).toMatchObject({ rule: "review.production", amount: 2 });
    expect(reviewListening(review({ elapsedMs: 1000 }))).toMatchObject({ rule: "review.listening", amount: 2 });
  });

  it("pays nothing for a wrong answer and owes no reason", () => {
    expect(reviewRecognition(review({ correct: false }))).toMatchObject({ amount: 0, zero: null });
  });

  it("explains every zero of a right answer", () => {
    expect(reviewRecognition(review({ due: false })).zero).toBe("not_due");
    expect(reviewRecognition(review({ alreadyCountedToday: true })).zero).toBe("already_counted_today");
    expect(reviewRecognition(review({ elapsedMs: 599 })).zero).toBe("too_fast");
    expect(reviewProduction(review({ elapsedMs: 999 })).zero).toBe("too_fast");
    expect(reviewListening(review({ audioPlays: 0 })).zero).toBe("no_audio");
  });

  it("applies the minimum time: 600 ms for a choice, 1 000 ms for a typed answer or a dictation", () => {
    expect(reviewRecognition(review({ elapsedMs: 600 })).amount).toBe(1);
    expect(reviewProduction(review({ elapsedMs: 1000 })).amount).toBe(2);
    expect(reviewOutcome("listening", review({ elapsedMs: 999 })).amount).toBe(0);
  });

  it("puts not due before the other reasons", () => {
    expect(reviewRecognition(review({ due: false, elapsedMs: 10, alreadyCountedToday: true })).zero).toBe("not_due");
  });

  it("gives the difficulty bonus under 3 days of stability and to leeches, never to a card without memory", () => {
    expect(reviewBonusDifficulty({ stability: 2.9, lapses: 0 }).amount).toBe(1);
    expect(reviewBonusDifficulty({ stability: 3, lapses: 0 }).amount).toBe(0);
    expect(reviewBonusDifficulty({ stability: 40, lapses: 6 }).amount).toBe(1);
    expect(reviewBonusDifficulty({ stability: 40, lapses: 5 }).amount).toBe(0);
    expect(reviewBonusDifficulty({ stability: null, lapses: 0 }).amount).toBe(0);
  });

  it("gives the reconquest bonus to a card rated 'again' the day before", () => {
    expect(reviewBonusReconquest({ lastRatingYesterday: 1 })).toMatchObject({ rule: "review.bonus.reconquest", amount: 1 });
    expect(reviewBonusReconquest({ lastRatingYesterday: 3 }).amount).toBe(0);
    expect(reviewBonusReconquest({ lastRatingYesterday: null }).amount).toBe(0);
  });
});

describe("reading", () => {
  const read = { score: 0.75, words: 300, readingMs: 80_000, answers: 4, firstPassOfDay: true };

  it("pays 15 XP from 60 %, 20 XP from 90 %", () => {
    expect(readingUnderstood(read)).toMatchObject({ rule: "reading.understood", amount: 15, volet: "input", long: false });
    expect(readingUnderstood({ ...read, score: 0.6 }).amount).toBe(15);
    expect(readingUnderstood({ ...read, score: 0.9 })).toMatchObject({ rule: "reading.understood_well", amount: 20 });
    expect(readingUnderstood({ ...read, score: 1 }).amount).toBe(20);
  });

  it("pays nothing under 60 %, or before 3 answers, without owing a reason", () => {
    expect(readingUnderstood({ ...read, score: 0.59 })).toMatchObject({ amount: 0, zero: null });
    expect(readingUnderstood({ ...read, answers: 2 })).toMatchObject({ amount: 0, zero: null });
  });

  it("multiplies by 1.5, rounded up, above 600 words", () => {
    expect(readingUnderstood({ ...read, words: 601, readingMs: 200_000 })).toMatchObject({ amount: 23, long: true });
    expect(readingUnderstood({ ...read, words: 700, readingMs: 200_000, score: 1 })).toMatchObject({ amount: 30, long: true });
    expect(readingUnderstood({ ...read, words: 600 }).long).toBe(false);
  });

  it("refuses a text scrolled faster than 400 words a minute and a text read again", () => {
    expect(minReadingMs(300)).toBe(45_000);
    expect(readingUnderstood({ ...read, readingMs: 44_999 })).toMatchObject({ amount: 0, zero: "too_fast" });
    expect(readingUnderstood({ ...read, readingMs: 45_000 }).amount).toBe(15);
    expect(readingUnderstood({ ...read, firstPassOfDay: false })).toMatchObject({ amount: 0, zero: "reread" });
  });
});

describe("workshop", () => {
  const focus = { attempt: 1, correct: true, firstWrong: false, alreadyPassedToday: false };

  it("pays 2 XP for a right first attempt and 1 XP for a right second one after a wrong first", () => {
    expect(focusFirstTry(focus)).toMatchObject({ rule: "focus.first_try", amount: 2 });
    expect(focusSecondTry({ ...focus, attempt: 2, firstWrong: true })).toMatchObject({ rule: "focus.second_try", amount: 1 });
  });

  it("pays nothing for a wrong answer, a third attempt or a second attempt after a right first one", () => {
    expect(focusFirstTry({ ...focus, correct: false }).amount).toBe(0);
    expect(focusSecondTry({ ...focus, attempt: 3, firstWrong: true }).amount).toBe(0);
    expect(focusSecondTry({ ...focus, attempt: 2, firstWrong: false }).amount).toBe(0);
    expect(focusFirstTry({ ...focus, attempt: 2 }).amount).toBe(0);
  });

  it("counts an item once a day", () => {
    expect(focusFirstTry({ ...focus, alreadyPassedToday: true })).toMatchObject({ amount: 0, zero: "already_counted_today" });
    expect(focusSecondTry({ ...focus, attempt: 2, firstWrong: true, alreadyPassedToday: true }).zero).toBe("already_counted_today");
  });

  it("pays 3 XP for an error of the day not reworked yet", () => {
    expect(errorOfDayReworked({ correct: true, alreadyReworked: false })).toMatchObject({ rule: "error_of_day.reworked", amount: 3 });
    expect(errorOfDayReworked({ correct: true, alreadyReworked: true })).toMatchObject({ amount: 0, zero: "already_counted_today" });
    expect(errorOfDayReworked({ correct: false, alreadyReworked: false }).amount).toBe(0);
  });
});

describe("expression", () => {
  const proof = { words: 70, minWords: 60, detectedLanguage: "it", targetLanguage: "it", similarity: 0.2 };

  it("pays 15 XP for an accepted production", () => {
    expect(productionCorrected(proof)).toMatchObject({ rule: "production.corrected", amount: 15, volet: "output", zero: null });
    expect(productionCorrected({ ...proof, detectedLanguage: null }).amount).toBe(15);
  });

  it("refuses a short text, another language and a copy, in that order", () => {
    expect(productionRejection({ ...proof, words: 59 })).toBe("too_short");
    expect(productionRejection({ ...proof, detectedLanguage: "fr" })).toBe("wrong_language");
    expect(productionRejection({ ...proof, similarity: 0.5 })).toBe("too_similar");
    expect(productionRejection({ ...proof, similarity: 0.49 })).toBeNull();
    expect(productionRejection({ ...proof, words: 10, detectedLanguage: "fr", similarity: 1 })).toBe("too_short");
    expect(productionCorrected({ ...proof, similarity: 0.9 })).toMatchObject({ amount: 0, zero: "too_similar" });
  });

  it("pays 5 XP for a rewritten sentence and 3 XP for the native version", () => {
    expect(rewriteSentence({ accepted: true, isNativeVersion: false })).toMatchObject({ rule: "rewrite.sentence", amount: 5 });
    expect(rewriteSentence({ accepted: true, isNativeVersion: true })).toMatchObject({ rule: "rewrite.sentence_native", amount: 3 });
    expect(rewriteSentence({ accepted: false, isNativeVersion: false }).amount).toBe(0);
  });
});

describe("fluency and session", () => {
  const pass = { durationMs: 60_000, words: 180, readingEarnedRecently: true, referenceWpm: 150 };

  it("pays 5 XP for a pass of a text already understood at 90 % of the reference speed or more", () => {
    expect(passWpm(180, 60_000)).toBe(180);
    expect(fluencyPass(pass)).toMatchObject({ rule: "fluency.pass", amount: 5, volet: "fluency" });
    expect(fluencyPass({ ...pass, durationMs: 80_000 }).amount).toBe(5); // 135 wpm = 90 % of 150
    expect(fluencyPass({ ...pass, durationMs: 90_000 }).amount).toBe(0); // 120 wpm: slower than the reference
    expect(fluencyPass({ ...pass, referenceWpm: null, durationMs: 120_000 }).amount).toBe(5);
  });

  it("refuses a pass under 10 s, over 400 words a minute, or on a text not understood", () => {
    expect(fluencyPass({ ...pass, durationMs: 9_000 })).toMatchObject({ amount: 0, zero: "too_fast" });
    expect(fluencyPass({ ...pass, durationMs: 26_000, words: 180 })).toMatchObject({ amount: 0, zero: "too_fast" });
    expect(fluencyPass({ ...pass, readingEarnedRecently: false }).amount).toBe(0);
  });

  it("pays the 10 XP of a complete daily session only", () => {
    expect(sessionComplete({ kind: "daily", allStepsValidated: true })).toMatchObject({ rule: "session.complete", amount: 10, volet: null });
    expect(sessionComplete({ kind: "daily", allStepsValidated: false }).amount).toBe(0);
    expect(sessionComplete({ kind: "catch_up", allStepsValidated: true }).amount).toBe(0);
    expect(sessionComplete({ kind: "review_only", allStepsValidated: true }).amount).toBe(0);
  });
});

describe("caps and yields", () => {
  it("stops the revisions at 120 XP and grants what fits", () => {
    expect(capReview(1, { successIndex: 1, xpToday: 0 })).toEqual({ amount: 1, zero: null, diminished: false });
    expect(capReview(2, { successIndex: 60, xpToday: 119 })).toMatchObject({ amount: 1, zero: null });
    expect(capReview(1, { successIndex: 61, xpToday: 120 })).toMatchObject({ amount: 0, zero: "cap_reached" });
  });

  it("pays one success in two from the 151st to the 300th, and none after", () => {
    expect(capReview(1, { successIndex: 150, xpToday: 0 }).amount).toBe(1);
    expect(capReview(1, { successIndex: 151, xpToday: 0 })).toMatchObject({ amount: 1, diminished: true });
    expect(capReview(1, { successIndex: 152, xpToday: 0 })).toMatchObject({ amount: 0, zero: "diminishing" });
    expect(capReview(1, { successIndex: 153, xpToday: 0 }).amount).toBe(1);
    expect(capReview(1, { successIndex: 300, xpToday: 0 }).zero).toBe("diminishing");
    expect(capReview(1, { successIndex: 299, xpToday: 0 }).amount).toBe(1);
    expect(capReview(1, { successIndex: 301, xpToday: 0 }).zero).toBe("diminishing");
  });

  it("pays 4 texts in full, then half rounded down, within 100 XP", () => {
    expect(capReading(15, { textsToday: 3, xpToday: 45 })).toEqual({ amount: 15, zero: null, diminished: false });
    expect(capReading(15, { textsToday: 4, xpToday: 60 })).toEqual({ amount: 7, zero: null, diminished: true });
    expect(capReading(23, { textsToday: 5, xpToday: 70 }).amount).toBe(11);
    expect(capReading(20, { textsToday: 2, xpToday: 90 }).amount).toBe(10);
    expect(capReading(20, { textsToday: 2, xpToday: 100 })).toMatchObject({ amount: 0, zero: "cap_reached" });
  });

  it("caps the workshop at 20 XP a session and 40 XP a day", () => {
    expect(capFocus(2, { xpSession: 18, xpDay: 18 }).amount).toBe(2);
    expect(capFocus(2, { xpSession: 20, xpDay: 20 })).toMatchObject({ amount: 0, zero: "cap_reached" });
    expect(capFocus(2, { xpSession: 5, xpDay: 40 }).zero).toBe("cap_reached");
    expect(capFocus(2, { xpSession: 19, xpDay: 19 }).amount).toBe(1);
  });

  it("caps rewrites at 2 a production and 20 XP a day", () => {
    expect(capRewrite(5, { rewardedForProduction: 1, xpDay: 10 }).amount).toBe(5);
    expect(capRewrite(5, { rewardedForProduction: 2, xpDay: 10 }).zero).toBe("cap_reached");
    expect(capRewrite(5, { rewardedForProduction: 0, xpDay: 18 }).amount).toBe(2);
    expect(capRewrite(5, { rewardedForProduction: 0, xpDay: 20 }).zero).toBe("cap_reached");
  });

  it("caps the rules paid by count", () => {
    expect(capCount(15, { rewardsToday: 1, max: DAILY_CAPS.productions }).amount).toBe(15);
    expect(capCount(15, { rewardsToday: 2, max: DAILY_CAPS.productions }).zero).toBe("cap_reached");
  });
});

describe("oral rules", () => {
  const spoken = (extra: Partial<Parameters<typeof shadowingSentence>[0]> = {}) => shadowingSentence({ ratio: 0.8, speakingMs: 3000, words: 4, alreadyCountedToday: false, ...extra });
  const typed = (extra: Partial<Parameters<typeof dictationSentence>[0]> = {}) => dictationSentence({ accuracy: 1, elapsedMs: 8000, alreadyCountedToday: false, ...extra });

  it("pays 1 XP in the fluency strand for a repetition at 60 % and over", () => {
    expect(spoken({ ratio: 0.6 })).toMatchObject({ rule: "shadowing.sentence", amount: 1, volet: "fluency", zero: null });
    expect(spoken({ ratio: 1 }).amount).toBe(1);
    expect(spoken({ ratio: 0.59 })).toMatchObject({ amount: 0, zero: null });
  });

  it("refuses a repetition spoken faster than 250 ms a word, or already paid today", () => {
    expect(spoken({ speakingMs: 999 })).toMatchObject({ amount: 0, zero: "too_fast" });
    expect(spoken({ speakingMs: 1000 }).amount).toBe(1);
    expect(spoken({ alreadyCountedToday: true })).toMatchObject({ amount: 0, zero: "already_counted_today" });
    expect(spoken({ ratio: 0.3, speakingMs: 1 })).toMatchObject({ amount: 0, zero: null });
  });

  it("pays a dictation 1 XP from 80 % and 2 XP from 95 %, in the input strand", () => {
    expect(typed({ accuracy: 0.79 })).toMatchObject({ amount: 0, zero: null });
    expect(typed({ accuracy: 0.8 })).toMatchObject({ rule: "dictation.sentence", amount: 1, volet: "input", zero: null });
    expect(typed({ accuracy: 0.94 }).amount).toBe(1);
    expect(typed({ accuracy: 0.95 }).amount).toBe(2);
    expect(typed({ accuracy: 1 }).amount).toBe(2);
  });

  it("refuses a dictation answered within a second, or already paid today", () => {
    expect(typed({ elapsedMs: 999 })).toMatchObject({ amount: 0, zero: "too_fast" });
    expect(typed({ elapsedMs: 1000 }).amount).toBe(2);
    expect(typed({ alreadyCountedToday: true })).toMatchObject({ amount: 0, zero: "already_counted_today" });
  });

  it("caps each activity at 30 XP a day", () => {
    expect(DAILY_CAPS.shadowing).toBe(30);
    expect(DAILY_CAPS.dictation).toBe(30);
    expect(capOral(2, { xpToday: 28, ceiling: DAILY_CAPS.dictation }).amount).toBe(2);
    expect(capOral(2, { xpToday: 29, ceiling: DAILY_CAPS.dictation }).amount).toBe(1);
    expect(capOral(1, { xpToday: 30, ceiling: DAILY_CAPS.shadowing })).toMatchObject({ amount: 0, zero: "cap_reached" });
  });
});

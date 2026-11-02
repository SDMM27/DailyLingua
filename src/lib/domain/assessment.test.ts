import { describe, expect, it } from "vitest";
import {
  assessmentInvite,
  canStartListening,
  countWords,
  decideComprehension,
  decideSpeaking,
  decideWriting,
  firstOpenStep,
  inviteVisible,
  levelsToOffer,
  lowerLevel,
  LISTENING_MAX_PLAYS,
  receptionLevel,
  type AssessmentStepDefinition,
  type StepAnswers,
} from "./assessment";

describe("countWords", () => {
  it("counts Russian words, not punctuation", () => {
    expect(countWords("Меня зовут Анна. Я живу в Москве!", "ru")).toBe(7);
  });

  it("counts Italian words and ignores empty text", () => {
    expect(countWords("Il gatto dorme sul divano.", "it")).toBe(5);
    expect(countWords("   ", "it")).toBe(0);
  });

  it("counts an Italian elision as one word (the segmenter keeps « l'amico » whole)", () => {
    // Observed with the runtime's ICU, not corrected: if it ever returns 2, limits are still fine.
    expect(countWords("l'amico", "it")).toBe(1);
    expect(countWords("Ho visto l'amico di Marco", "it")).toBe(5);
  });
});

describe("canStartListening", () => {
  it("allows listenings until the maximum is reached", () => {
    expect(LISTENING_MAX_PLAYS).toBe(3);
    expect([0, 1, 2].map(canStartListening)).toEqual([true, true, true]);
    expect([3, 4].map(canStartListening)).toEqual([false, false]);
  });
});

describe("lowerLevel", () => {
  it("goes one level down, and stops at A1", () => {
    expect(lowerLevel("C2")).toBe("C1");
    expect(lowerLevel("B1")).toBe("A2");
    expect(lowerLevel("A2")).toBe("A1");
    expect(lowerLevel("A1")).toBe("A1");
  });
});

describe("decideComprehension", () => {
  const high = { level: "B1", confidence: "high", offerHigher: true };
  const low = { level: "A2", confidence: "low", offerHigher: false };
  const medium = { level: "B1", confidence: "medium", offerHigher: false };

  it("confirms the level from 2.5 points", () => {
    expect(decideComprehension("B1", ["correct", "correct", "correct"])).toEqual(high);
    expect(decideComprehension("B1", ["correct", "correct", "partial"])).toEqual(high); // 2.5
  });

  it("is uncertain between 1 and 2.5 (exclusive)", () => {
    expect(decideComprehension("B1", ["correct", "correct", "wrong"])).toEqual(medium); // 2
    expect(decideComprehension("B1", ["correct", "partial", "partial"])).toEqual(medium); // 2
    expect(decideComprehension("B1", ["correct", "partial", "wrong"])).toEqual(medium); // 1.5
  });

  it("lowers the level up to 1 point", () => {
    expect(decideComprehension("B1", ["correct", "wrong", "wrong"])).toEqual(low); // 1
    expect(decideComprehension("B1", ["partial", "partial", "wrong"])).toEqual(low); // 1
    expect(decideComprehension("B1", ["wrong", "wrong", "wrong"])).toEqual(low);
  });

  it("never goes below A1 and offers nothing higher at C2", () => {
    expect(decideComprehension("A1", ["wrong", "wrong", "wrong"])).toEqual({ level: "A1", confidence: "low", offerHigher: false });
    expect(decideComprehension("C2", ["correct", "correct", "correct"])).toEqual({ level: "C2", confidence: "high", offerHigher: false });
  });
});

describe("decideWriting", () => {
  it("confirms the level from a mean of 3.75", () => {
    expect(decideWriting("B2", [4, 4, 4, 3])).toEqual({ level: "B2", confidence: "high", offerHigher: true }); // 3.75
    expect(decideWriting("B2", [5, 5, 5, 5])).toMatchObject({ confidence: "high" });
  });

  it("is uncertain above 2 and below 3.75", () => {
    expect(decideWriting("B2", [4, 3, 4, 3])).toEqual({ level: "B2", confidence: "medium", offerHigher: false }); // 3.5
    expect(decideWriting("B2", [3, 2, 2, 2])).toMatchObject({ confidence: "medium" }); // 2.25
  });

  it("lowers the level up to a mean of 2", () => {
    expect(decideWriting("B2", [2, 2, 2, 2])).toEqual({ level: "B1", confidence: "low", offerHigher: false });
    expect(decideWriting("B2", [3, 2, 2, 1])).toMatchObject({ level: "B1", confidence: "low" }); // 2
  });

  it("never goes below A1 and offers nothing higher at C2", () => {
    expect(decideWriting("A1", [1, 1, 1, 1])).toEqual({ level: "A1", confidence: "low", offerHigher: false });
    expect(decideWriting("C2", [5, 5, 4, 5])).toEqual({ level: "C2", confidence: "high", offerHigher: false });
  });
});

describe("decideSpeaking", () => {
  const claims = [
    { id: "a", level: "A1" },
    { id: "b", level: "A2" },
    { id: "c", level: "B1" },
    { id: "d", level: "B1" },
  ] as const;

  it("takes the highest level whose statements up to it are all ticked", () => {
    expect(decideSpeaking([...claims], { a: true, b: true, c: true, d: true })).toEqual({ level: "B1", confidence: "low" });
    expect(decideSpeaking([...claims], { a: true, b: true, c: false, d: true })).toEqual({ level: "A2", confidence: "low" });
  });

  it("counts a missing answer as no, and none ticked as A1", () => {
    expect(decideSpeaking([...claims], { a: true, c: true })).toEqual({ level: "A1", confidence: "low" });
    expect(decideSpeaking([...claims], { a: false })).toEqual({ level: "A1", confidence: "low" });
  });

  it("is null without any answer", () => {
    expect(decideSpeaking([...claims], {})).toBeNull();
  });
});

describe("receptionLevel", () => {
  it("is the lowest of reading and listening", () => {
    expect(receptionLevel({ reading: { level: "B2" }, listening: { level: "B1" } })).toBe("B1");
    expect(receptionLevel({ reading: { level: "A2" }, listening: { level: "C1" } })).toBe("A2");
  });

  it("uses the only one assessed, or null", () => {
    expect(receptionLevel({ reading: null, listening: { level: "B1" } })).toBe("B1");
    expect(receptionLevel({ reading: { level: "B2" }, listening: null })).toBe("B2");
    expect(receptionLevel({ reading: null, listening: null })).toBeNull();
  });
});

describe("firstOpenStep", () => {
  const steps: AssessmentStepDefinition[] = [
    { step: "reading", ids: ["r1", "r2"] },
    { step: "listening", ids: ["l1", "l2"] },
    { step: "writing", ids: [] },
    { step: "speaking", ids: ["s1", "s2"] },
  ];
  const none: StepAnswers = { questions: {}, writing: "", speaking: {} };
  const answers = (patch: Partial<StepAnswers>): StepAnswers => ({ ...none, ...patch });

  it("starts with the first step when nothing was done, blank answers included", () => {
    expect(firstOpenStep(steps, none, 0)).toBe("reading");
    expect(firstOpenStep(steps, answers({ questions: { r1: "  " }, writing: "\n" }), 0)).toBe("reading");
  });

  it("stays on a step that is started but not finished", () => {
    expect(firstOpenStep(steps, answers({ questions: { r1: "oui" } }), 0)).toBe("reading");
  });

  it("moves on to the next step once every question of the furthest one is answered", () => {
    expect(firstOpenStep(steps, answers({ questions: { r1: "a", r2: "b" } }), 0)).toBe("listening");
  });

  it("counts a listening started as touched, even without any answer yet", () => {
    expect(firstOpenStep(steps, none, 1)).toBe("listening");
    expect(firstOpenStep(steps, answers({ questions: { r1: "a", r2: "b", l1: "c", l2: "d" } }), 2)).toBe("writing");
  });

  it("does not bring the learner back to a step they left empty", () => {
    expect(firstOpenStep(steps, answers({ questions: { l1: "c" } }), 1)).toBe("listening");
    expect(firstOpenStep(steps, answers({ writing: "Una frase." }), 0)).toBe("speaking");
  });

  it("finishes on the last step, answered in full or in part", () => {
    expect(firstOpenStep(steps, answers({ speaking: { s1: true } }), 0)).toBe("speaking");
    expect(firstOpenStep(steps, answers({ speaking: { s1: true, s2: false } }), 0)).toBe("speaking");
  });

  it("works with the steps it is given", () => {
    const withoutListening = steps.filter((s) => s.step !== "listening");
    expect(firstOpenStep(withoutListening, answers({ questions: { r1: "a", r2: "b" } }), 0)).toBe("writing");
  });
});

describe("assessmentInvite", () => {
  const base = { hasCompletedPlacement: true, hasVisibleDossier: true, lastGradedOn: null, today: "2026-11-02" };

  it("proposes the first assessment once the placement test is done", () => {
    expect(assessmentInvite(base)).toBe("first");
    expect(assessmentInvite({ ...base, hasCompletedPlacement: false })).toBeNull();
  });

  it("proposes nothing without a dossier to offer", () => {
    expect(assessmentInvite({ ...base, hasVisibleDossier: false })).toBeNull();
    expect(assessmentInvite({ ...base, hasVisibleDossier: false, lastGradedOn: "2026-01-01" })).toBeNull();
  });

  it("proposes a new assessment from 60 days after the last graded one, not before", () => {
    // 2026-09-03 → 2026-11-02 is 60 days.
    expect(assessmentInvite({ ...base, lastGradedOn: "2026-09-03" })).toBe("redo");
    expect(assessmentInvite({ ...base, lastGradedOn: "2026-09-04" })).toBeNull();
    expect(assessmentInvite({ ...base, lastGradedOn: "2026-11-02" })).toBeNull();
  });

  it("asks for the redo even when the placement test was skipped", () => {
    expect(assessmentInvite({ ...base, hasCompletedPlacement: false, lastGradedOn: "2026-01-01" })).toBe("redo");
  });
});

describe("inviteVisible", () => {
  const today = "2026-11-02";

  it("shows an invitation that was never dismissed", () => {
    expect(inviteVisible({ dismissedOn: null, dismissCount: 0, today })).toBe(true);
  });

  it("hides it after one dismissal for 13 days and shows it again on the 14th", () => {
    expect(inviteVisible({ dismissedOn: "2026-10-20", dismissCount: 1, today })).toBe(false); // 13 days
    expect(inviteVisible({ dismissedOn: "2026-10-19", dismissCount: 1, today })).toBe(true); // 14 days
    expect(inviteVisible({ dismissedOn: today, dismissCount: 1, today })).toBe(false);
  });

  it("never shows it again after two dismissals", () => {
    expect(inviteVisible({ dismissedOn: "2026-01-01", dismissCount: 2, today })).toBe(false);
    expect(inviteVisible({ dismissedOn: "2026-01-01", dismissCount: 5, today })).toBe(false);
  });

  it("keeps it hidden when the dismissal is dated in the future (clock change)", () => {
    expect(inviteVisible({ dismissedOn: "2026-12-01", dismissCount: 1, today })).toBe(false);
  });
});

describe("levelsToOffer", () => {
  const none = { reading: null, listening: null, writing: null };
  const graded = (offerHigher: boolean) => ({ offerHigher });

  it("offers the level above when a skill confirmed the dossier with room to go", () => {
    expect(levelsToOffer("B1", { ...none, reading: graded(true) })).toEqual(["B2"]);
    expect(levelsToOffer("A1", { ...none, listening: graded(false), writing: graded(true) })).toEqual(["A2"]);
  });

  it("offers nothing when no skill asks for it, or when nothing was assessed", () => {
    expect(levelsToOffer("B1", { ...none, reading: graded(false), listening: graded(false) })).toEqual([]);
    expect(levelsToOffer("B1", none)).toEqual([]);
  });

  it("never goes past C2", () => {
    expect(levelsToOffer("C2", { ...none, reading: graded(true) })).toEqual([]);
    expect(levelsToOffer("C1", { ...none, reading: graded(true) })).toEqual(["C2"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import type { AssessmentGrade, AssessmentGrader } from "@/lib/generation/assessment-grading";
import { GenerationError } from "@/lib/generation/errors";
import type { AssessmentResults } from "@/lib/schemas/assessment";
import { gradeAssessment, UNANSWERED_COMMENT } from "./grade-assessment";
import type { AssessmentGradingStore, AssessmentToGrade, CompleteGradingInput } from "./supabase-store";

const R = ["it-b1-1-r1", "it-b1-1-r2", "it-b1-1-r3"];
const L = ["it-b1-1-l1", "it-b1-1-l2", "it-b1-1-l3"];

const stored = (overrides: Partial<AssessmentToGrade> = {}): AssessmentToGrade => ({
  language: "it",
  dossierId: "it-b1-1",
  status: "in_progress",
  answers: {
    questions: { [R[0]]: "r1", [R[1]]: "r2", [R[2]]: "r3", [L[0]]: "l1", [L[1]]: "l2", [L[2]]: "l3" },
    writing: "Secondo me il progetto è utile.",
    speaking: { s1: true, s2: true, s3: false },
  },
  listeningPlays: 2,
  results: null,
  ...overrides,
});

function grade(verdicts: Record<string, "correct" | "partial" | "wrong">, writing = [4, 4, 4, 4]): AssessmentGrade {
  return {
    review: {
      questions: Object.fromEntries(Object.entries(verdicts).map(([id, verdict]) => [id, { verdict, comment: `c-${id}` }])),
      writing: { scores: { grammar: writing[0], vocabulary: writing[1], syntax: writing[2], adequacy: writing[3] }, comment: "cw" },
    },
    model: "claude-test",
    promptVersion: "pv",
    usage: { inputTokens: 100, outputTokens: 50 },
  };
}

const ALL_CORRECT = Object.fromEntries([...R, ...L].map((id) => [id, "correct" as const]));

function setup(options: { found?: AssessmentToGrade | null; claim?: number | null; grader?: AssessmentGrader["grade"]; policy?: "show" | "hide" } = {}) {
  const found = options.found === undefined ? stored() : options.found;
  const store = {
    loadForGrading: vi.fn(async () => found),
    claimGrading: vi.fn(async () => (options.claim === undefined ? 1 : options.claim)),
    completeGrading: vi.fn<(input: CompleteGradingInput) => Promise<void>>(async () => {}),
  } satisfies AssessmentGradingStore;
  const grader = { grade: vi.fn(options.grader ?? (async () => grade(ALL_CORRECT))) };
  const log = vi.fn();
  const run = () =>
    gradeAssessment({ userId: "u", assessmentId: "a" }, { store, grader, policy: options.policy ?? "show", log });
  return { store, grader, log, run };
}

function readyResults(outcome: Awaited<ReturnType<ReturnType<typeof setup>["run"]>>): AssessmentResults {
  if (outcome.status !== "ready") throw new Error(`expected ready, got ${outcome.status}`);
  return outcome.results;
}

describe("gradeAssessment", () => {
  it("grades everything in one call, decides the levels in code and stores the graded answers", async () => {
    const { store, grader, run } = setup();
    const outcome = await run();
    const results = readyResults(outcome);

    expect(grader.grade).toHaveBeenCalledTimes(1);
    const request = grader.grade.mock.calls[0][0];
    expect(request).toMatchObject({ language: "it", level: "B1" });
    expect(request.questions.map((q) => q.id)).toEqual([...R, ...L]);
    expect(request.writing?.text).toBe("Secondo me il progetto è utile.");
    // Neither the text nor the script of the dossier is sent.
    expect(JSON.stringify(request)).not.toContain("Valbruna");

    expect(results.reading).toEqual({ level: "B1", confidence: "high", offerHigher: true });
    expect(results.listening).toEqual({ level: "B1", confidence: "high", offerHigher: true });
    expect(results.writing).toEqual({ level: "B1", confidence: "high", offerHigher: true });
    expect(results.speaking).toEqual({ level: "A2", confidence: "low", declared: true });
    expect(results.review.questions[R[0]]).toEqual({ verdict: "correct", comment: `c-${R[0]}` });
    expect(results.review.writing?.scores).toEqual({ grammar: 4, vocabulary: 4, syntax: 4, adequacy: 4 });

    expect(store.claimGrading).toHaveBeenCalledWith("a", "u");
    expect(store.completeGrading).toHaveBeenCalledTimes(1);
    const completed = store.completeGrading.mock.calls[0][0];
    expect(completed).toMatchObject({
      assessmentId: "a",
      userId: "u",
      productionLevel: "B1",
      model: "claude-test",
      promptVersion: "pv",
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    expect(completed.results).toEqual(results);
    // The goal level is not part of what is written.
    expect(Object.keys(completed)).not.toContain("level");
  });

  it("stores exactly the answers it sent, even if others are saved meanwhile", async () => {
    let current = stored();
    const original = JSON.parse(JSON.stringify(current.answers));
    const { store, grader, run } = setup({
      found: current,
      grader: async () => {
        // The learner saves other answers while the model works.
        current = stored({ answers: { questions: { [R[0]]: "changed" }, writing: "changed", speaking: {} } });
        return grade(ALL_CORRECT);
      },
    });
    await run();
    expect(store.completeGrading.mock.calls[0][0].answers).toEqual(original);
    expect(grader.grade.mock.calls[0][0].questions[0].answer).toBe("r1");
  });

  it("applies the writing level as production level, lowered when the text is weak", async () => {
    const { store, run } = setup({ grader: async () => grade(ALL_CORRECT, [2, 2, 2, 2]) });
    const results = readyResults(await run());
    expect(results.writing).toEqual({ level: "A2", confidence: "low", offerHigher: false });
    expect(store.completeGrading.mock.calls[0][0].productionLevel).toBe("A2");
  });

  it("lowers the reading level when most answers are wrong", async () => {
    const { run } = setup({ grader: async () => grade({ ...ALL_CORRECT, [R[0]]: "wrong", [R[1]]: "wrong", [R[2]]: "partial" }) });
    const results = readyResults(await run());
    expect(results.reading).toEqual({ level: "A2", confidence: "low", offerHigher: false });
    expect(results.listening?.confidence).toBe("high");
  });

  it("returns the results of an assessment already graded, without a call", async () => {
    const first = readyResults(await setup().run());
    const { store, grader, run } = setup({ found: stored({ status: "graded", results: first }) });
    expect(await run()).toEqual({ status: "ready", results: first });
    expect(grader.grade).not.toHaveBeenCalled();
    expect(store.claimGrading).not.toHaveBeenCalled();
    expect(store.completeGrading).not.toHaveBeenCalled();
  });

  it("does not find an assessment that is not the user's", async () => {
    const { store, grader, run } = setup({ found: null });
    expect(await run()).toEqual({ status: "not-found" });
    expect(store.claimGrading).not.toHaveBeenCalled();
    expect(grader.grade).not.toHaveBeenCalled();
  });

  it("refuses a draft dossier under the hide policy: no attempt claimed, no model call", async () => {
    const { store, grader, run } = setup({ policy: "hide" });
    expect(await run()).toEqual({ status: "unavailable-dossier" });
    expect(store.claimGrading).not.toHaveBeenCalled();
    expect(grader.grade).not.toHaveBeenCalled();
    expect(store.completeGrading).not.toHaveBeenCalled();
  });

  it("refuses an unknown dossier and a dossier of another language", async () => {
    for (const found of [stored({ dossierId: "it-b1-99" }), stored({ language: "ru" })]) {
      const { store, grader, run } = setup({ found });
      expect(await run()).toEqual({ status: "unavailable-dossier" });
      expect(store.claimGrading).not.toHaveBeenCalled();
      expect(grader.grade).not.toHaveBeenCalled();
    }
  });

  it("sends no blank answer: it counts as wrong, with a fixed comment, without the model", async () => {
    const { grader, run } = setup({
      found: stored({
        answers: { questions: { [R[0]]: "r1", [R[1]]: "   ", [L[0]]: "l1", [L[1]]: "l2", [L[2]]: "l3" }, writing: "", speaking: {} },
      }),
      grader: async () => grade({ [R[0]]: "correct", [L[0]]: "correct", [L[1]]: "correct", [L[2]]: "correct" }),
    });
    const results = readyResults(await run());
    expect(grader.grade.mock.calls[0][0].questions.map((q) => q.id)).toEqual([R[0], L[0], L[1], L[2]]);
    expect(grader.grade.mock.calls[0][0].writing).toBeNull();
    expect(results.review.questions[R[1]]).toEqual({ verdict: "wrong", comment: UNANSWERED_COMMENT });
    expect(results.review.questions[R[2]]).toEqual({ verdict: "wrong", comment: UNANSWERED_COMMENT });
    // 1 + 0 + 0 points: lowered.
    expect(results.reading).toEqual({ level: "A2", confidence: "low", offerHigher: false });
    expect(results.writing).toBeNull();
    expect(results.review.writing).toBeNull();
  });

  it("does not assess a test without any answer", async () => {
    const { run } = setup({
      found: stored({ answers: { questions: { [R[0]]: "r1", [R[1]]: "r2", [R[2]]: "r3" }, writing: "", speaking: {} }, listeningPlays: 0 }),
      grader: async () => grade({ [R[0]]: "correct", [R[1]]: "correct", [R[2]]: "correct" }),
    });
    const results = readyResults(await run());
    expect(results.reading?.confidence).toBe("high");
    expect(results.listening).toBeNull();
    expect(results.writing).toBeNull();
    expect(results.speaking).toBeNull();
    expect(Object.keys(results.review.questions)).toEqual(R);
  });

  it("counts a listening that was started (plays) but left unanswered as wrong, without the model", async () => {
    const { grader, run } = setup({
      found: stored({ answers: { questions: { [R[0]]: "r1", [R[1]]: "r2", [R[2]]: "r3" }, writing: "", speaking: {} }, listeningPlays: 1 }),
      grader: async () => grade({ [R[0]]: "correct", [R[1]]: "correct", [R[2]]: "correct" }),
    });
    const results = readyResults(await run());
    expect(grader.grade.mock.calls[0][0].questions.map((q) => q.id)).toEqual(R);
    expect(results.listening).toEqual({ level: "A2", confidence: "low", offerHigher: false });
  });

  it("grades a text alone", async () => {
    const { grader, run } = setup({
      found: stored({ answers: { questions: {}, writing: "Un testo.", speaking: {} }, listeningPlays: 0 }),
      grader: async () => grade({}, [3, 3, 3, 3]),
    });
    const results = readyResults(await run());
    expect(grader.grade.mock.calls[0][0].questions).toEqual([]);
    expect(results).toMatchObject({ reading: null, listening: null, writing: { level: "B1", confidence: "medium" } });
  });

  it("records the declared speaking level alone without claiming an attempt nor calling the model", async () => {
    const { store, grader, run } = setup({
      found: stored({ answers: { questions: {}, writing: " ", speaking: { s1: true, s2: true, s3: true } }, listeningPlays: 0 }),
    });
    const results = readyResults(await run());
    expect(results).toMatchObject({ reading: null, listening: null, writing: null, speaking: { level: "B1", confidence: "low", declared: true } });
    expect(grader.grade).not.toHaveBeenCalled();
    expect(store.claimGrading).not.toHaveBeenCalled();
    expect(store.completeGrading.mock.calls[0][0]).toMatchObject({ model: null, promptVersion: null, usage: null, productionLevel: null });
  });

  it("makes no call at all when everything is empty", async () => {
    for (const answers of [
      { questions: {}, writing: "", speaking: {} },
      { questions: { [R[0]]: "  " }, writing: "  ", speaking: {} },
      { questions: {}, writing: "", speaking: { unknown: true } },
    ]) {
      const { store, grader, run } = setup({ found: stored({ answers, listeningPlays: 0 }) });
      expect(await run()).toEqual({ status: "empty" });
      expect(grader.grade).not.toHaveBeenCalled();
      expect(store.claimGrading).not.toHaveBeenCalled();
      expect(store.completeGrading).not.toHaveBeenCalled();
    }
  });

  it("is empty when the stored answers are unreadable", async () => {
    const { grader, run } = setup({ found: stored({ answers: { questions: "nope" } }) });
    expect(await run()).toEqual({ status: "empty" });
    expect(grader.grade).not.toHaveBeenCalled();
  });

  it("stops when no attempt is left", async () => {
    const { store, grader, run } = setup({ claim: null });
    expect(await run()).toEqual({ status: "limit" });
    expect(grader.grade).not.toHaveBeenCalled();
    expect(store.completeGrading).not.toHaveBeenCalled();
  });

  it("does not throw when the model fails: unavailable, attempts left, a log with the reason only", async () => {
    const { store, log, run } = setup({
      claim: 2,
      found: stored({ answers: { questions: { [R[0]]: "SECRET-ANSWER" }, writing: "", speaking: {} } }),
      grader: async () => {
        throw new GenerationError("invalid_output", "retour invalide (questions)");
      },
    });
    expect(await run()).toEqual({ status: "unavailable", attemptsLeft: 1 });
    expect(store.completeGrading).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain("invalid_output: retour invalide (questions)");
    expect(log.mock.calls[0][0]).not.toContain("SECRET-ANSWER");
  });

  it("never logs a raw error", async () => {
    const { log, run } = setup({
      claim: 3,
      grader: async () => {
        throw new Error("raw error with sk-ant-secret and the answers");
      },
    });
    expect(await run()).toEqual({ status: "unavailable", attemptsLeft: 0 });
    expect(log.mock.calls[0][0]).toContain("unexpected error");
    expect(log.mock.calls[0][0]).not.toContain("sk-ant-secret");
  });
});

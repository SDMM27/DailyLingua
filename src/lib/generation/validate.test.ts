import { describe, expect, it } from "vitest";
import {
  GENERATION_LIMITS,
  type CandidateContent,
  type GenerationRequest,
  type GenerationResult,
  type SessionRequest,
  type WireSession,
} from "@/lib/schemas/generation";
import { GenerationError } from "./errors";
import { validateGeneratedMission, validateGeneratedSession } from "./validate";

function candidate(id: string): CandidateContent {
  return {
    id,
    type: "article",
    title: `Titre ${id}`,
    summary: "Résumé",
    sourceName: "Source",
    difficulty: "B1",
    durationMinutes: 5,
    categories: [],
    publishedAt: null,
  };
}

function sessionRequest(language: SessionRequest["language"] = "it"): SessionRequest {
  return {
    language,
    level: "B1",
    targetLevel: "B2",
    focus: "",
    purpose: "general",
    topics: ["société"],
    minutes: 20,
    productionMode: "speaking",
    productionMinutes: 6,
    candidates: [candidate("c0"), candidate("c1")],
  };
}

const goodQuestion = { prompt: "Chi parla?", options: ["Marco", "Anna", "Luca"], answerIndex: 1, explanation_fr: "Anna parle." };
const goodExpression = { text: "andare avanti", translation_fr: "continuer", example: "Dobbiamo andare avanti.", note_fr: "" };

function wire(overrides: Partial<WireSession> = {}): WireSession {
  return {
    language: "it",
    candidateIndex: 1,
    questions: [goodQuestion],
    expressions: [goodExpression],
    production: { prompt: "Che ne pensi?", hints_fr: ["Un conseil", "Un autre"] },
    ...overrides,
  };
}

function reason(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof GenerationError ? error.reason : "other";
  }
  return undefined;
}

describe("validateGeneratedSession", () => {
  it("maps a good session, assigning ids and taking the mode from the request", () => {
    const result = validateGeneratedSession(
      wire({ questions: [goodQuestion, goodQuestion], expressions: [goodExpression, { ...goodExpression, text: "tirare avanti", note_fr: " usage " }] }),
      sessionRequest(),
      "ai",
    );
    expect(result.content.id).toBe("c1");
    expect(result.questions.map((q) => q.id)).toEqual(["it-q1", "it-q2"]);
    expect(result.expressions.map((e) => e.id)).toEqual(["it-e1", "it-e2"]);
    expect(result.expressions[0].note).toBeUndefined();
    expect(result.expressions[1].note).toBe("usage");
    expect(result.production).toEqual({
      mode: "speaking",
      prompt: "Che ne pensi?",
      hints: ["Un conseil", "Un autre"],
    });
  });

  it("trims strings", () => {
    const result = validateGeneratedSession(
      wire({ questions: [{ ...goodQuestion, prompt: "  Chi parla?  ", options: [" Marco ", "Anna ", " Luca"] }] }),
      sessionRequest(),
      "ai",
    );
    expect(result.questions[0].prompt).toBe("Chi parla?");
    expect(result.questions[0].options).toEqual(["Marco", "Anna", "Luca"]);
  });

  it.each([
    ["empty prompt", { ...goodQuestion, prompt: "  " }],
    ["empty explanation", { ...goodQuestion, explanation_fr: "" }],
    ["too few options", { ...goodQuestion, options: ["A", "B"], answerIndex: 0 }],
    ["too many options", { ...goodQuestion, options: ["A", "B", "C", "D", "E"] }],
    ["empty option", { ...goodQuestion, options: ["A", " ", "C"] }],
    ["duplicate option", { ...goodQuestion, options: ["A", "a", "C"] }],
    ["answer out of range", { ...goodQuestion, answerIndex: 3 }],
    ["negative answer", { ...goodQuestion, answerIndex: -1 }],
    ["too long", { ...goodQuestion, explanation_fr: "x".repeat(GENERATION_LIMITS.longText + 1) }],
  ])("drops a question with %s", (_name, bad) => {
    const result = validateGeneratedSession(wire({ questions: [bad, goodQuestion] }), sessionRequest(), "ai");
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].id).toBe("it-q1");
  });

  it("keeps at most the maximum number of questions and expressions", () => {
    const expressions = Array.from({ length: 10 }, (_, i) => ({ ...goodExpression, text: `expr ${i}` }));
    const result = validateGeneratedSession(
      wire({ questions: Array.from({ length: 6 }, () => goodQuestion), expressions }),
      sessionRequest(),
      "ai",
    );
    expect(result.questions).toHaveLength(GENERATION_LIMITS.questions.max);
    expect(result.expressions).toHaveLength(GENERATION_LIMITS.expressions.max);
  });

  it("drops incomplete, duplicate and over-long expressions", () => {
    const result = validateGeneratedSession(
      wire({
        expressions: [
          { ...goodExpression, text: "" },
          { ...goodExpression, translation_fr: " " },
          { ...goodExpression, example: "" },
          { ...goodExpression, example: "x".repeat(GENERATION_LIMITS.longText + 1) },
          goodExpression,
          { ...goodExpression, text: "Andare Avanti" },
          { ...goodExpression, text: "altro" },
        ],
      }),
      sessionRequest(),
      "ai",
    );
    expect(result.expressions.map((e) => e.text)).toEqual(["andare avanti", "altro"]);
  });

  it("cleans hints and leaves the target length to the app", () => {
    const result = validateGeneratedSession(
      wire({
        production: {
          prompt: "Che ne pensi?",
          hints_fr: [" ", "a", "b", "c", "d", "e"],
        },
      }),
      sessionRequest(),
      "ai",
    );
    expect(result.production.hints).toEqual(["a", "b", "c", "d"]);
    expect(result.production.targetLength).toBeUndefined();
  });

  it("throws on an empty or over-long production prompt", () => {
    const production = { prompt: " ", hints_fr: [] };
    expect(reason(() => validateGeneratedSession(wire({ production }), sessionRequest(), "ai"))).toBe("invalid_output");
    const long = { ...production, prompt: "x".repeat(GENERATION_LIMITS.longText + 1) };
    expect(reason(() => validateGeneratedSession(wire({ production: long }), sessionRequest(), "ai"))).toBe("invalid_output");
  });

  it("throws on a language mismatch or a bad candidate index", () => {
    expect(reason(() => validateGeneratedSession(wire({ language: "es" }), sessionRequest(), "ai"))).toBe("invalid_output");
    for (const candidateIndex of [-1, 2, 0.5]) {
      expect(reason(() => validateGeneratedSession(wire({ candidateIndex }), sessionRequest(), "ai"))).toBe("invalid_output");
    }
  });

  it("requires expressions from the model but not from the template", () => {
    expect(reason(() => validateGeneratedSession(wire({ expressions: [] }), sessionRequest(), "ai"))).toBe("invalid_output");
    const result = validateGeneratedSession(wire({ expressions: [], questions: [] }), sessionRequest(), "template");
    expect(result.expressions).toEqual([]);
  });
});

describe("validateGeneratedMission", () => {
  const request: GenerationRequest = {
    date: "2026-10-13",
    sessions: [sessionRequest("it"), sessionRequest("es")],
  };
  const result = (sessions: WireSession[]): GenerationResult => ({
    source: "ai",
    model: "m",
    promptVersion: "v",
    sessions,
    usage: null,
  });

  it("returns one session per requested language, in request order", () => {
    const sessions = validateGeneratedMission(result([wire({ language: "es" }), wire({ language: "it" })]), request);
    expect(sessions.map((s) => s.language)).toEqual(["it", "es"]);
    expect(sessions[1].questions[0].id).toBe("es-q1");
  });

  it("throws on a missing or duplicated language", () => {
    expect(reason(() => validateGeneratedMission(result([wire()]), request))).toBe("invalid_output");
    expect(
      reason(() => validateGeneratedMission(result([wire(), wire(), wire({ language: "es" })]), request)),
    ).toBe("invalid_output");
  });
});

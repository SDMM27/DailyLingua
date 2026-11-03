import { describe, expect, it } from "vitest";
import { assessmentAnswersSchema, assessmentResultsSchema, assessmentSchema } from "./assessment";

describe("assessment answers", () => {
  it("defaults every part, so a partial save parses", () => {
    expect(assessmentAnswersSchema.parse({})).toEqual({ questions: {}, writing: "", speaking: {} });
    expect(assessmentAnswersSchema.parse({ questions: { q1: "a" } }).writing).toBe("");
  });

  it("limits an answer to 1500 characters and the writing to 2500", () => {
    expect(assessmentAnswersSchema.safeParse({ questions: { q1: "x".repeat(1500) } }).success).toBe(true);
    expect(assessmentAnswersSchema.safeParse({ questions: { q1: "x".repeat(1501) } }).success).toBe(false);
    expect(assessmentAnswersSchema.safeParse({ writing: "x".repeat(2500) }).success).toBe(true);
    expect(assessmentAnswersSchema.safeParse({ writing: "x".repeat(2501) }).success).toBe(false);
  });
});

describe("assessment results", () => {
  const skill = { level: "B1", confidence: "medium", offerHigher: false };
  const review = { questions: { q1: { verdict: "partial", comment: "Presque." } }, writing: null };
  const results = (overrides: Record<string, unknown> = {}) => ({
    reading: skill,
    listening: null,
    writing: skill,
    speaking: null,
    review,
    ...overrides,
  });

  it("accepts a null skill (not assessed) and requires speaking to be declared", () => {
    expect(assessmentResultsSchema.safeParse(results()).success).toBe(true);
    expect(assessmentResultsSchema.safeParse(results({ speaking: skill })).success).toBe(false);
    expect(assessmentResultsSchema.safeParse(results({ speaking: { level: "B1", confidence: "low", declared: true } })).success).toBe(true);
  });

  it("requires the review and a flag to offer a harder dossier on graded skills", () => {
    expect(assessmentResultsSchema.safeParse({ ...results(), review: undefined }).success).toBe(false);
    expect(assessmentResultsSchema.safeParse(results({ reading: { level: "B1", confidence: "low" } })).success).toBe(false);
  });

  it("checks the review: known verdicts, scores from 1 to 5, no blank comment", () => {
    const withReview = (value: unknown) => assessmentResultsSchema.safeParse(results({ review: value })).success;
    const scores = { grammar: 3, vocabulary: 3, syntax: 3, adequacy: 3 };
    expect(withReview({ questions: {}, writing: { scores, comment: "Bien." } })).toBe(true);
    expect(withReview({ questions: { q1: { verdict: "great", comment: "c" } }, writing: null })).toBe(false);
    expect(withReview({ questions: { q1: { verdict: "wrong", comment: " " } }, writing: null })).toBe(false);
    expect(withReview({ questions: {}, writing: { scores: { ...scores, syntax: 6 }, comment: "c" } })).toBe(false);
    expect(withReview({ questions: {}, writing: { scores: { ...scores, syntax: 0 }, comment: "c" } })).toBe(false);
  });

  it("refuses an unknown level or confidence", () => {
    expect(assessmentResultsSchema.safeParse(results({ reading: { ...skill, level: "D1" } })).success).toBe(false);
    expect(assessmentResultsSchema.safeParse(results({ reading: { ...skill, confidence: "sure" } })).success).toBe(false);
  });
});

describe("assessment", () => {
  const base = {
    id: "1",
    language: "ru",
    dossierId: "ru-b2-1",
    status: "in_progress",
    answers: {},
    listeningPlays: 3,
    results: null,
    startedAt: "2026-11-02T10:00:00Z",
    gradedAt: null,
  };

  it("parses an assessment in progress", () => {
    expect(assessmentSchema.parse(base).answers.questions).toEqual({});
  });

  it("bounds the listening plays", () => {
    expect(assessmentSchema.safeParse({ ...base, listeningPlays: 4 }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...base, listeningPlays: -1 }).success).toBe(false);
  });
});

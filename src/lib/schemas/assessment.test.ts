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
  const skill = { level: "B1", confidence: "medium" };

  it("accepts a null skill (not assessed) and requires speaking to be declared", () => {
    expect(assessmentResultsSchema.safeParse({ reading: skill, listening: null, writing: skill, speaking: null }).success).toBe(true);
    expect(assessmentResultsSchema.safeParse({ reading: skill, listening: null, writing: skill, speaking: skill }).success).toBe(false);
    expect(
      assessmentResultsSchema.safeParse({ reading: skill, listening: null, writing: skill, speaking: { ...skill, declared: true } }).success,
    ).toBe(true);
  });

  it("refuses an unknown level or confidence", () => {
    expect(assessmentResultsSchema.safeParse({ reading: { level: "D1", confidence: "low" }, listening: null, writing: null, speaking: null }).success).toBe(false);
    expect(assessmentResultsSchema.safeParse({ reading: { level: "B1", confidence: "sure" }, listening: null, writing: null, speaking: null }).success).toBe(false);
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

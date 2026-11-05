import { describe, expect, it } from "vitest";
import { aiReviewSchema, grammarPointSchema } from "@/lib/schemas/grammar";
import { grammarReviewStatus, isGrammarPointVisible, readGrammarDraftPolicy } from "./policy";
import { FIXTURE_POINT } from "@/test/grammar-fixtures";

const AI_REVIEW = { on: "2026-11-05", model: "claude-opus-4-8", rubric: "v1" };

describe("readGrammarDraftPolicy", () => {
  it("shows drafts by default, except in production", () => {
    expect(readGrammarDraftPolicy({})).toBe("show");
    expect(readGrammarDraftPolicy({ VERCEL_ENV: "preview" })).toBe("show");
    expect(readGrammarDraftPolicy({ VERCEL_ENV: "production" })).toBe("hide");
  });

  it("lets GRAMMAR_DRAFTS decide", () => {
    expect(readGrammarDraftPolicy({ GRAMMAR_DRAFTS: "show", VERCEL_ENV: "production" })).toBe("show");
    expect(readGrammarDraftPolicy({ GRAMMAR_DRAFTS: " hide " })).toBe("hide");
  });

  it("fails on an unknown value", () => {
    expect(() => readGrammarDraftPolicy({ GRAMMAR_DRAFTS: "yes" })).toThrow(/GRAMMAR_DRAFTS/);
  });
});

describe("isGrammarPointVisible", () => {
  it("hides drafts only under the hide policy", () => {
    const draft = grammarPointSchema.parse({ ...FIXTURE_POINT, reviewedOn: null });
    const reviewed = grammarPointSchema.parse({ ...FIXTURE_POINT, reviewedOn: "2026-10-01" });
    expect(isGrammarPointVisible(draft, "show")).toBe(true);
    expect(isGrammarPointVisible(draft, "hide")).toBe(false);
    expect(isGrammarPointVisible(reviewed, "hide")).toBe(true);
  });

  it("keeps points reviewed by AI visible under the hide policy", () => {
    const ai = grammarPointSchema.parse({ ...FIXTURE_POINT, reviewedOn: null, aiReview: AI_REVIEW });
    expect(isGrammarPointVisible(ai, "show")).toBe(true);
    expect(isGrammarPointVisible(ai, "hide")).toBe(true);
  });
});

describe("grammarReviewStatus", () => {
  it("tells native, AI-reviewed and draft points apart", () => {
    expect(grammarReviewStatus({ ...FIXTURE_POINT, reviewedOn: "2026-10-01" })).toBe("native");
    expect(grammarReviewStatus({ ...FIXTURE_POINT, reviewedOn: null, aiReview: AI_REVIEW })).toBe("ai");
    expect(grammarReviewStatus({ ...FIXTURE_POINT, reviewedOn: null })).toBe("draft");
  });

  it("lets native approval win over the AI review", () => {
    expect(grammarReviewStatus({ ...FIXTURE_POINT, reviewedOn: "2026-10-01", aiReview: AI_REVIEW })).toBe("native");
  });
});

describe("aiReviewSchema", () => {
  it("accepts a complete review and a point without one", () => {
    expect(aiReviewSchema.safeParse(AI_REVIEW).success).toBe(true);
    expect(grammarPointSchema.safeParse({ ...FIXTURE_POINT, aiReview: AI_REVIEW }).success).toBe(true);
    expect(grammarPointSchema.safeParse({ ...FIXTURE_POINT }).success).toBe(true);
  });

  it("rejects a bad date, an empty model or a missing rubric", () => {
    expect(aiReviewSchema.safeParse({ ...AI_REVIEW, on: "demain" }).success).toBe(false);
    expect(aiReviewSchema.safeParse({ ...AI_REVIEW, model: " " }).success).toBe(false);
    expect(aiReviewSchema.safeParse({ on: AI_REVIEW.on, model: AI_REVIEW.model }).success).toBe(false);
    expect(grammarPointSchema.safeParse({ ...FIXTURE_POINT, aiReview: { ...AI_REVIEW, rubric: "" } }).success).toBe(false);
  });
});

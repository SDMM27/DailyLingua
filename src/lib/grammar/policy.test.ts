import { describe, expect, it } from "vitest";
import { grammarPointSchema } from "@/lib/schemas/grammar";
import { isGrammarPointVisible, readGrammarDraftPolicy } from "./policy";
import { FIXTURE_POINT } from "@/test/grammar-fixtures";

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
});

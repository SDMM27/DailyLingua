import { describe, expect, it } from "vitest";
import { applyGrammarPatch, grammarPatchFileSchema, type GrammarPatch } from "./apply-patch";

const OPTIONS = { pointIds: ["xx-a1-one", "xx-a1-two"], date: "2026-11-10", model: "gpt-test", rubric: "x0-chatgpt-2026-11-10" };
const REVIEW = 'aiReview: { on: "2026-11-10", model: "gpt-test", rubric: "x0-chatgpt-2026-11-10" },';

const SOURCE = [
  "export const xxCourse = {",
  '  language: "xx",',
  '  version: "2026-11-05",',
  "  points: [",
  "    {",
  '      id: "xx-a1-one",',
  '      summary: "L’article défini",',
  '      rule: ["Vingt mille"],',
  "      reviewedOn: null,",
  "    },",
  "    {",
  '      id: "xx-a1-two",',
  '      summary: "Deux",',
  "      reviewedOn: null,",
  '      aiReview: { on: "2026-11-05", model: "old", rubric: "old" },',
  "    },",
  "  ],",
  "};",
  "",
].join("\n");

const patch = (find: string, replace: string, id = "xx-a1-one"): GrammarPatch => ({ id, field: "summary", find, replace });
const file = (patches: GrammarPatch[], approved = ["xx-a1-one", "xx-a1-two"], drafts: string[] = []) => ({
  language: "xx",
  approved,
  drafts,
  patches,
});

describe("grammarPatchFileSchema", () => {
  it("accepts an empty patch list and rejects an empty find", () => {
    expect(grammarPatchFileSchema.safeParse(file([])).success).toBe(true);
    expect(grammarPatchFileSchema.safeParse(file([patch("", "x")])).success).toBe(false);
  });
});

describe("applyGrammarPatch matching", () => {
  it("applies an exact match", () => {
    const result = applyGrammarPatch(SOURCE, file([patch('summary: "Deux"', 'summary: "Two"', "xx-a1-two")]), OPTIONS);
    expect(result.applied).toHaveLength(1);
    expect(result.text).toContain('summary: "Two"');
  });

  it("tolerates non-breaking spaces and apostrophe variants", () => {
    const result = applyGrammarPatch(SOURCE, file([patch("L'article défini", "L’article")]), OPTIONS);
    expect(result.failed).toEqual([]);
    expect(result.text).toContain('summary: "L’article"');
    const nbsp = applyGrammarPatch(SOURCE, file([patch("Vingt mille", "Trente mille")]), OPTIONS);
    expect(nbsp.text).toContain("Trente mille");
  });

  it("refuses an ambiguous match", () => {
    const result = applyGrammarPatch(SOURCE, file([patch("reviewedOn: null", "reviewedOn: null")]), OPTIONS);
    expect(result.failed.map((f) => f.reason)).toEqual(["ambiguous"]);
    expect(result.applied).toEqual([]);
  });

  it("reports a missing find", () => {
    const result = applyGrammarPatch(SOURCE, file([patch("absent", "x")]), OPTIONS);
    expect(result.failed.map((f) => f.reason)).toEqual(["not-found"]);
  });

  it("applies patches in order", () => {
    const result = applyGrammarPatch(SOURCE, file([patch("Deux", "Trois", "xx-a1-two"), patch("Trois", "Quatre", "xx-a1-two")]), OPTIONS);
    expect(result.text).toContain('summary: "Quatre"');
  });

  it("keeps `$` in the replacement literal", () => {
    const result = applyGrammarPatch(SOURCE, file([patch("Deux", "$& $1", "xx-a1-two")]), OPTIONS);
    expect(result.text).toContain('summary: "$& $1"');
  });
});

describe("applyGrammarPatch review", () => {
  it("moves an approved point to drafts when one of its patches failed", () => {
    const result = applyGrammarPatch(SOURCE, file([patch("absent", "x")]), OPTIONS);
    expect(result.approved).toEqual(["xx-a1-two"]);
    expect(result.drafts).toEqual(["xx-a1-one"]);
    expect(result.text).not.toContain(REVIEW);
  });

  it("inserts aiReview after reviewedOn with the same indentation, without duplicating", () => {
    const result = applyGrammarPatch(SOURCE, file([]), OPTIONS);
    expect(result.text).toContain(`      reviewedOn: null,\n      ${REVIEW}\n    },`);
    expect(result.text.match(/aiReview:/g)).toHaveLength(2);
    expect(result.text).toContain('aiReview: { on: "2026-11-05", model: "old", rubric: "old" }');
  });

  it("bumps the version only when something changed", () => {
    expect(applyGrammarPatch(SOURCE, file([]), OPTIONS).text).toContain('version: "2026-11-10",');
    const untouched = applyGrammarPatch(SOURCE, file([], [], ["xx-a1-one", "xx-a1-two"]), OPTIONS);
    expect(untouched.text).toBe(SOURCE);
    const onlyExisting = applyGrammarPatch(SOURCE, file([], ["xx-a1-two"], ["xx-a1-one"]), OPTIONS);
    expect(onlyExisting.text).toBe(SOURCE);
  });
});

describe("applyGrammarPatch problems", () => {
  it("is clean when approved and drafts cover the points once", () => {
    expect(applyGrammarPatch(SOURCE, file([], ["xx-a1-one"], ["xx-a1-two"]), OPTIONS).problems).toEqual([]);
  });

  it("flags missing, duplicated and unknown ids", () => {
    const missing = applyGrammarPatch(SOURCE, file([], ["xx-a1-one"], []), OPTIONS);
    expect(missing.problems.join()).toMatch(/xx-a1-two.*neither/);
    const twice = applyGrammarPatch(SOURCE, file([], ["xx-a1-one", "xx-a1-two"], ["xx-a1-one"]), OPTIONS);
    expect(twice.problems.join()).toMatch(/xx-a1-one.*2 times/);
    const unknown = applyGrammarPatch(SOURCE, file([patch("Deux", "Un", "xx-zzz")], ["xx-a1-one", "xx-a1-two", "xx-zzz"]), OPTIONS);
    expect(unknown.problems.join()).toMatch(/unknown point "xx-zzz"/);
  });
});

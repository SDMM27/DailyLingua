import { describe, expect, it } from "vitest";
import { SOURCE_CATALOG } from "./catalog";
import { catalogCoverage, renderMatrix } from "./coverage";

describe("catalogCoverage", () => {
  const base = SOURCE_CATALOG.find((s) => s.itemFormat === "youtube")!;

  it("counts a video channel for its difficulty and for every level of its rules", () => {
    const matrix = catalogCoverage([
      { ...base, language: "de", difficulty: "B1", levelRules: [{ pattern: /A2/, difficulty: "A2" }, { pattern: /B1/, difficulty: "B1" }] },
      { ...base, language: "de", difficulty: "C2", levelRules: undefined },
    ], "video");
    expect(matrix.de).toEqual({ A1: 0, A2: 1, B1: 1, B2: 0, C1: 0, C2: 1 });
  });

  it("ignores the other content types", () => {
    const matrix = catalogCoverage([{ ...base, contentType: "article", language: "es" }], "video");
    expect(Object.values(matrix.es).every((n) => n === 0)).toBe(true);
  });

  it("counts podcasts for the podcast matrix only", () => {
    const podcast = { ...base, contentType: "podcast" as const, language: "pt" as const, difficulty: "B2" as const, levelRules: undefined };
    expect(catalogCoverage([podcast], "podcast").pt.B2).toBe(1);
    expect(catalogCoverage([podcast], "video").pt.B2).toBe(0);
  });

  it("makes empty cells stand out", () => {
    const out = renderMatrix(catalogCoverage([{ ...base, language: "ru", difficulty: "A1" }], "video"));
    expect(out).toMatch(/^ru {5,}1/m);
    expect(out).toMatch(/Cases vides : \d+ \(/);
  });
});

import { describe, expect, it } from "vitest";
import { SOURCE_CATALOG } from "./catalog";
import { catalogVideoCoverage, renderMatrix } from "./coverage";

describe("catalogVideoCoverage", () => {
  const base = SOURCE_CATALOG.find((s) => s.itemFormat === "youtube")!;

  it("counts a video channel for its difficulty and for every level of its rules", () => {
    const matrix = catalogVideoCoverage([
      { ...base, language: "de", difficulty: "B1", levelRules: [{ pattern: /A2/, difficulty: "A2" }, { pattern: /B1/, difficulty: "B1" }] },
      { ...base, language: "de", difficulty: "C2", levelRules: undefined },
    ]);
    expect(matrix.de).toEqual({ A1: 0, A2: 1, B1: 1, B2: 0, C1: 0, C2: 1 });
  });

  it("ignores articles and podcasts", () => {
    const matrix = catalogVideoCoverage([{ ...base, contentType: "article", language: "es" }]);
    expect(Object.values(matrix.es).every((n) => n === 0)).toBe(true);
  });

  it("makes empty cells stand out", () => {
    const out = renderMatrix(catalogVideoCoverage([{ ...base, language: "ru", difficulty: "A1" }]));
    expect(out).toMatch(/^ru {5,}1/m);
    expect(out).toMatch(/Cases vides : \d+ \(/);
  });
});

import { describe, expect, it } from "vitest";
import { SOURCE_CATALOG } from "./catalog";
import { catalogCoverage, renderMatrix, renderTopicMatrix, topicCoverage } from "./coverage";

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

describe("topicCoverage", () => {
  const rows = [
    { language: "ru" as const, difficulty: "C1" as const, topics: ["sciences", "histoire"] },
    { language: "ru" as const, difficulty: "C1" as const, topics: ["sciences"] },
    { language: "ru" as const, difficulty: "B2" as const, topics: [] },
    { language: "ru" as const, difficulty: "B2" as const, topics: null },
    { language: "it" as const, difficulty: "C1" as const, topics: ["sport"] },
  ];

  it("counts a content once for each of its domains, for the chosen language only", () => {
    const { matrix } = topicCoverage(rows, "ru");
    expect(matrix.sciences).toEqual({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 2, C2: 0 });
    expect(matrix.histoire.C1).toBe(1);
    expect(matrix.sport.C1).toBe(0);
  });

  it("ignores the unclassified and counts them apart; a classified content with no domain counts nowhere", () => {
    const { matrix, unclassified } = topicCoverage(rows, "ru");
    expect(unclassified).toBe(1);
    expect(Object.values(matrix).flatMap((levels) => Object.values(levels)).reduce((a, b) => a + b, 0)).toBe(3);
    expect(topicCoverage(rows, "it").unclassified).toBe(0);
  });

  it("does not count a domain twice for one content", () => {
    const { matrix } = topicCoverage([{ language: "de", difficulty: "A1", topics: ["sport", "sport"] }], "de");
    expect(matrix.sport.A1).toBe(1);
  });

  it("renders one row per domain with empty cells marked", () => {
    const out = renderTopicMatrix(topicCoverage(rows, "ru").matrix);
    expect(out.split("\n")).toHaveLength(13);
    expect(out).toMatch(/^sciences +· +· +· +· +2 +·$/m);
  });
});

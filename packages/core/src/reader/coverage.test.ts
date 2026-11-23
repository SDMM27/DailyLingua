import { describe, expect, it } from "vitest";
import { estimateReadingCoverage } from "./coverage";

describe("estimateReadingCoverage", () => {
  it("counts repeated words but excludes punctuation and standalone numbers", () => {
    expect(estimateReadingCoverage("Pane, pane e 2 mele.", "it", ["PANE", "pane"])).toEqual({
      recognized: 2, total: 4, ratio: 0.5,
    });
  });

  it("uses the written form and preserves meaningful accents", () => {
    expect(estimateReadingCoverage("Sì, si vede; c’è pane.", "it", ["Sì", "c'è"])).toEqual({
      recognized: 2, total: 5, ratio: 0.4,
    });
  });

  it("distinguishes missing evidence from no matching words", () => {
    expect(estimateReadingCoverage("Pane e mele.", "it", [])).toBeNull();
    expect(estimateReadingCoverage("Pane e mele.", "it", ["burro"])).toEqual({
      recognized: 0, total: 3, ratio: 0,
    });
  });
});

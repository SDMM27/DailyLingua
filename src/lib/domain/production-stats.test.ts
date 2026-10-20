import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/domain/dates";
import type { WritingCorrection, WritingFeedback } from "@/lib/schemas/writing-feedback";
import { productionStats, recurringCorrectionIndexes } from "./production-stats";

const TODAY = "2026-10-20";

function review(categories: (WritingCorrection["category"] | "none")[], score = 3): WritingFeedback {
  const criterion = { score, comment: "Ok." };
  return {
    scores: { grammar: criterion, vocabulary: criterion, register: criterion, coherence: criterion },
    corrections: categories.map((category, i) => ({
      original: `a${i}`,
      corrected: `b${i}`,
      explanation: "x",
      ...(category === "none" ? {} : { category }),
    })),
    strength: "Bien.",
  };
}

const entry = (daysAgo: number, feedback?: WritingFeedback, language: "ru" | "it" = "ru") => ({
  date: addDays(TODAY, -daysAgo),
  language,
  feedback,
});

describe("productionStats", () => {
  it("is empty without any review", () => {
    expect(productionStats([], TODAY)).toEqual([]);
    expect(productionStats([entry(1)], TODAY)).toEqual([]);
  });

  it("puts the window bounds on the right side", () => {
    const [stats] = productionStats(
      [
        entry(0, review(["verb"])), // today: recent
        entry(29, review(["verb"])), // oldest recent day
        entry(30, review(["agreement"])), // newest previous day
        entry(59, review(["agreement"])), // oldest previous day
        entry(60, review(["spelling"])), // out
        entry(-1, review(["spelling"])), // future: out
      ],
      TODAY,
    );
    expect(stats.categories).toEqual([
      { category: "verb", recent: 2, previous: 0 },
      { category: "agreement", recent: 0, previous: 2 },
    ]);
    expect(stats.reviewedCount).toEqual({ recent: 2, previous: 2 });
  });

  it("sorts categories by recent count, ignores uncategorised corrections and absent categories", () => {
    const [stats] = productionStats(
      [entry(2, review(["verb", "spelling", "spelling", "none"])), entry(40, review(["agreement"]))],
      TODAY,
    );
    expect(stats.categories.map((c) => c.category)).toEqual(["spelling", "verb", "agreement"]);
    expect(stats.categories.find((c) => c.category === "word_order")).toBeUndefined();
  });

  it("averages each criterion per window, null when a window is empty", () => {
    const [stats] = productionStats([entry(1, review([], 4)), entry(2, review([], 2))], TODAY);
    expect(stats.averages.recent.grammar).toBe(3);
    expect(stats.averages.previous.grammar).toBeNull();
    expect(stats.reviewedCount).toEqual({ recent: 2, previous: 0 });
  });

  it("separates languages and can restrict to one", () => {
    const entries = [entry(1, review(["verb"]), "it"), entry(1, review(["spelling"]), "ru")];
    expect(productionStats(entries, TODAY).map((s) => s.language)).toEqual(["ru", "it"]);
    expect(productionStats(entries, TODAY, "it").map((s) => s.language)).toEqual(["it"]);
  });
});

describe("recurringCorrectionIndexes", () => {
  it("flags the corrections whose category was seen before", () => {
    const current = review(["verb", "spelling", "none", "agreement"]);
    expect(recurringCorrectionIndexes(current, [review(["agreement"]), review(["verb", "other"])])).toEqual([0, 3]);
  });

  it("flags nothing without earlier reviews", () => {
    expect(recurringCorrectionIndexes(review(["verb"]), [])).toEqual([]);
  });
});

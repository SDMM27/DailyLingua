import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/domain/dates";
import type { CefrLevel } from "@/lib/schemas/common";
import type { GrammarCard, GrammarPoint } from "@/lib/schemas/grammar";
import type { CorrectionCategory, WritingFeedback } from "@/lib/schemas/writing-feedback";
import { FIXTURE_POINT } from "@/test/grammar-fixtures";
import { GRAMMAR_SUGGESTION_MAX, suggestGrammarPoints } from "./grammar-suggestions";

const TODAY = "2026-10-20";

function review(categories: CorrectionCategory[]): WritingFeedback {
  const criterion = { score: 3, comment: "Ok." };
  return {
    scores: { grammar: criterion, vocabulary: criterion, register: criterion, coherence: criterion },
    corrections: categories.map((category, i) => ({
      original: `a${i}`,
      corrected: `b${i}`,
      explanation: "x",
      category,
    })),
    strength: "Bien.",
  };
}

const entry = (categories: CorrectionCategory[], daysAgo = 1, language: "it" | "ru" = "it") => ({
  date: addDays(TODAY, -daysAgo),
  language,
  feedback: review(categories),
});

const point = (id: string, categories: CorrectionCategory[], level: CefrLevel = "A1"): GrammarPoint => ({
  ...FIXTURE_POINT,
  id,
  level,
  categories,
});

const card = (pointId: string, box = 1): GrammarCard => ({
  id: `card-${pointId}`,
  pointId,
  language: "it",
  status: "learning",
  review: { box, dueOn: TODAY, lastReviewedOn: null, reviewCount: 1 },
  addedOn: "2026-10-01",
});

const suggest = (overrides: Partial<Parameters<typeof suggestGrammarPoints>[0]>) =>
  suggestGrammarPoints({
    language: "it",
    entries: [entry(["agreement", "agreement", "agreement"])],
    points: [point("p1", ["agreement"])],
    cards: [],
    level: "B1",
    today: TODAY,
    ...overrides,
  });

describe("suggestGrammarPoints", () => {
  it("needs three errors of a category", () => {
    expect(suggest({ entries: [entry(["agreement", "agreement"])] })).toEqual([]);
    const [only] = suggest({});
    expect(only.point.id).toBe("p1");
    expect(only.reasons).toEqual([{ category: "agreement", count: 3 }]);
  });

  it("counts errors across several texts", () => {
    expect(suggest({ entries: [entry(["verb"]), entry(["verb"], 5), entry(["verb"], 9)], points: [point("p", ["verb"])] })).toHaveLength(1);
  });

  it("ignores the categories that are not grammatical", () => {
    const entries = [entry(["word_choice", "word_choice", "word_choice", "spelling", "spelling", "spelling"])];
    expect(suggest({ entries, points: [point("p", ["word_choice", "spelling"])] })).toEqual([]);
  });

  it("leaves out mastered points but keeps practised ones", () => {
    const points = [point("a", ["agreement"]), point("b", ["agreement"])];
    expect(suggest({ points, cards: [card("a", 4)] }).map((s) => s.point.id)).toEqual(["b"]);
    expect(suggest({ points, cards: [card("a", 1)] }).map((s) => s.point.id)).toEqual(["b", "a"]);
  });

  it("keeps the points of the learner's level or below, and everything above B1", () => {
    const points = [point("a1", ["agreement"], "A1"), point("a2", ["agreement"], "A2"), point("b1", ["agreement"], "B1")];
    expect(suggest({ points, level: "A2" }).map((s) => s.point.id)).toEqual(["a1", "a2"]);
    expect(suggest({ points, level: "A1" }).map((s) => s.point.id)).toEqual(["a1"]);
    expect(suggest({ points, level: "C1" })).toHaveLength(3);
  });

  it("ranks by errors, then new before practised, then teaching order", () => {
    const entries = [entry(["verb", "verb", "verb", "verb", "agreement", "agreement", "agreement"])];
    const points = [
      point("agr", ["agreement"]), // 3, practised
      point("agr-new", ["agreement"]), // 3, new
      point("both", ["agreement", "verb"]), // 7
      point("verb", ["verb"]), // 4
    ];
    const result = suggest({ entries, points, cards: [card("agr")] });
    expect(result.map((s) => s.point.id)).toEqual(["both", "verb", "agr-new"]);
    expect(result[0].reasons).toEqual([
      { category: "verb", count: 4 },
      { category: "agreement", count: 3 },
    ]);
  });

  it("keeps the order of the points on a tie", () => {
    const points = [point("first", ["agreement"]), point("second", ["agreement"])];
    expect(suggest({ points }).map((s) => s.point.id)).toEqual(["first", "second"]);
  });

  it("keeps at most three points", () => {
    const points = ["a", "b", "c", "d", "e"].map((id) => point(id, ["agreement"]));
    expect(suggest({ points })).toHaveLength(GRAMMAR_SUGGESTION_MAX);
  });

  it("ignores errors older than 30 days", () => {
    expect(suggest({ entries: [entry(["agreement", "agreement", "agreement"], 30)] })).toEqual([]);
    expect(suggest({ entries: [entry(["agreement", "agreement"]), entry(["agreement"], 45)] })).toEqual([]);
  });

  it("ignores the errors of another language", () => {
    expect(suggest({ entries: [entry(["agreement", "agreement", "agreement"], 1, "ru")] })).toEqual([]);
  });
});

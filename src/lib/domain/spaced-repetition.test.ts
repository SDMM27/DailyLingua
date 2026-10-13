import { describe, expect, it } from "vitest";
import type { VocabularyItem } from "@/lib/schemas/vocabulary";
import {
  MAX_BOX,
  applyReview,
  dueToday,
  initialReviewState,
  isDue,
  relativeDueLabel,
  upcomingReviews,
} from "./spaced-repetition";

const TODAY = "2026-10-13";

describe("applyReview", () => {
  it("moves a new word up one box on 'good'", () => {
    const next = applyReview(initialReviewState(TODAY), "good", TODAY);
    expect(next).toEqual({ box: 1, dueOn: "2026-10-15", lastReviewedOn: TODAY, reviewCount: 1 });
  });

  it("jumps two boxes on 'easy'", () => {
    const next = applyReview({ ...initialReviewState(TODAY), box: 2 }, "easy", TODAY);
    expect(next.box).toBe(4);
    expect(next.dueOn).toBe("2026-10-29"); // 16 days
  });

  it("resets to box 0 and tomorrow on 'again'", () => {
    const next = applyReview({ ...initialReviewState(TODAY), box: 5 }, "again", TODAY);
    expect(next.box).toBe(0);
    expect(next.dueOn).toBe("2026-10-14");
  });

  it("keeps the box and halves the interval on 'hard'", () => {
    const next = applyReview({ ...initialReviewState(TODAY), box: 3 }, "hard", TODAY);
    expect(next.box).toBe(3);
    expect(next.dueOn).toBe("2026-10-17"); // 8 / 2
  });

  it("never exceeds the last box", () => {
    const next = applyReview({ ...initialReviewState(TODAY), box: MAX_BOX }, "easy", TODAY);
    expect(next.box).toBe(MAX_BOX);
  });
});

describe("due words", () => {
  const item = (id: string, dueOn: string, status: VocabularyItem["status"] = "learning"): VocabularyItem => ({
    id,
    language: "ru",
    term: id,
    translation: id,
    status,
    addedOn: "2026-10-01",
    review: { box: 1, dueOn, lastReviewedOn: null, reviewCount: 0 },
  });

  const items = [
    item("later", "2026-10-20"),
    item("today", TODAY),
    item("overdue", "2026-10-10"),
    item("known", "2026-10-01", "known"),
  ];

  it("treats overdue and today as due", () => {
    expect(isDue(items[2].review, TODAY)).toBe(true);
    expect(isDue(items[1].review, TODAY)).toBe(true);
    expect(isDue(items[0].review, TODAY)).toBe(false);
  });

  it("orders upcoming reviews and excludes known words", () => {
    expect(upcomingReviews(items).map((i) => i.id)).toEqual(["overdue", "today", "later"]);
    expect(dueToday(items, TODAY).map((i) => i.id)).toEqual(["overdue", "today"]);
  });

  it("does not mutate its input", () => {
    upcomingReviews(items);
    expect(items[0].id).toBe("later");
  });

  it("labels due dates relative to today", () => {
    expect(relativeDueLabel("2026-10-12", TODAY)).toBe("en retard");
    expect(relativeDueLabel(TODAY, TODAY)).toBe("aujourd'hui");
    expect(relativeDueLabel("2026-10-14", TODAY)).toBe("demain");
    expect(relativeDueLabel("2026-10-18", TODAY)).toBe("dans 5 j");
  });
});

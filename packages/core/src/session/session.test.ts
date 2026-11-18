import { describe, expect, it } from "vitest";
import {
  NEW_CARDS_SUSPENDED_DAYS,
  READING_QUESTIONS,
  STEP_MINUTES,
  WAKE_LIMITS,
  WORKSHOP_COMPOSITION,
  chooseErrorOfDay,
  isErrorWorkable,
  isResumption,
  newCardsSuspendedThrough,
  nextDensity,
  planDay,
  planWake,
  readingScore,
  rewriteSentenceCount,
  sessionSteps,
  type PlanCard,
} from "./index";

const NOW = new Date("2026-11-12T10:00:00Z");
const DAY = 86_400_000;

function card(id: string, extra: Partial<PlanCard> = {}): PlanCard {
  return { id, state: "review", dueAt: new Date(NOW.getTime() - DAY), stability: 5, lastReviewAt: new Date(NOW.getTime() - 6 * DAY), lastRatingYesterday: null, ...extra };
}

describe("step budgets", () => {
  it("sum to the format, 9.5 at format 10", () => {
    for (const format of [15, 20, 30] as const) {
      const total = Object.values(STEP_MINUTES[format]).reduce((a, b) => a + b, 0);
      expect(total).toBe(format);
    }
    expect(sessionSteps(10, 0).reduce((s, step) => s + step.minutes, 0)).toBe(9.5);
    expect(sessionSteps(10, 1).reduce((s, step) => s + step.minutes, 0)).toBe(9.5);
  });

  it("alternates the workshop and the momentum at format 10 by the parity of sessions completed", () => {
    const required = (completed: number) => sessionSteps(10, completed).filter((s) => s.required).map((s) => s.step);
    expect(required(0)).toEqual(["wake", "reading", "workshop", "expression"]);
    expect(required(1)).toEqual(["wake", "reading", "expression", "momentum"]);
    expect(required(2)).toEqual(required(0));
  });

  it("requires all five steps at the other formats", () => {
    for (const format of [15, 20, 30] as const) expect(sessionSteps(format, 1).every((s) => s.required)).toBe(true);
  });

  it("composes the workshop and the questions as in the tables", () => {
    expect(WORKSHOP_COMPOSITION[10].total).toBe(7);
    expect(WORKSHOP_COMPOSITION[15].total).toBe(9);
    expect(WORKSHOP_COMPOSITION[20].total).toBe(14);
    expect(WORKSHOP_COMPOSITION[30].total).toBe(17);
    expect(READING_QUESTIONS).toEqual({ 10: 3, 15: 4, 20: 4, 30: 4 });
    expect(rewriteSentenceCount(10)).toBe(1);
    expect(rewriteSentenceCount(15)).toBe(2);
  });
});

describe("resumption", () => {
  it("starts after 3 whole days without a session", () => {
    expect(isResumption("2026-11-08", "2026-11-12")).toBe(true); // 9, 10, 11 missed
    expect(isResumption("2026-11-09", "2026-11-12")).toBe(false); // 10, 11 missed
    expect(isResumption(null, "2026-11-12")).toBe(false);
    expect(newCardsSuspendedThrough("2026-11-12")).toBe("2026-11-13");
    expect(NEW_CARDS_SUSPENDED_DAYS).toBe(2);
  });
});

describe("planWake", () => {
  const base = { format: 15 as const, now: NOW, errorItemId: null, resumption: false, newCardsToday: 0, newCardsSuspendedThrough: null, today: "2026-11-12" };

  it("serves reconquest first, then the weakest recall, then new cards", () => {
    const cards = [
      card("strong", { stability: 50 }),
      card("weak", { stability: 2 }),
      card("missed", { lastRatingYesterday: 1, stability: 100 }),
      card("fresh", { state: "new", stability: null, lastReviewAt: null }),
      card("later", { dueAt: new Date(NOW.getTime() + DAY) }),
      card("off", { state: "suspended" }),
    ];
    const plan = planWake({ ...base, cards, errorItemId: "err" });
    expect(plan.cardIds).toEqual(["missed", "weak", "strong", "fresh"]);
    expect(plan.newCardIds).toEqual(["fresh"]);
    expect(plan.errorItemId).toBe("err");
  });

  it("stops at the cap of the format and leaves the rest due", () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`c${String(i).padStart(2, "0")}`));
    const plan = planWake({ ...base, cards });
    expect(plan.cardIds).toHaveLength(WAKE_LIMITS[15].maxCards);
    expect(plan.leftDue).toBe(8);
    expect(plan.newCardIds).toEqual([]);
  });

  it("limits the new cards to what remains of the day", () => {
    const cards = Array.from({ length: 12 }, (_, i) => card(`n${i}`, { state: "new", stability: null, lastReviewAt: null }));
    expect(planWake({ ...base, cards }).newCardIds).toHaveLength(9);
    expect(planWake({ ...base, cards, newCardsToday: 7 }).newCardIds).toHaveLength(2);
    expect(planWake({ ...base, cards, newCardsToday: 9 }).newCardIds).toHaveLength(0);
  });

  it("holds new cards back during a suspension", () => {
    const cards = [card("n", { state: "new", stability: null, lastReviewAt: null })];
    expect(planWake({ ...base, cards, newCardsSuspendedThrough: "2026-11-13" }).cardIds).toEqual([]);
    expect(planWake({ ...base, cards, newCardsSuspendedThrough: "2026-11-11" }).cardIds).toEqual(["n"]);
  });

  it("caps a resumption at 20 cards whatever the format", () => {
    const cards = Array.from({ length: 40 }, (_, i) => card(`c${String(i).padStart(2, "0")}`));
    expect(planWake({ ...base, format: 30, resumption: true, cards }).cardIds).toHaveLength(20);
    expect(planWake({ ...base, format: 10, resumption: true, cards }).cardIds).toHaveLength(20);
  });
});

describe("planDay", () => {
  const base = {
    format: 15 as const,
    kind: "daily" as const,
    now: NOW,
    today: "2026-11-12",
    cards: [] as PlanCard[],
    errorItemId: null,
    lastSessionDay: "2026-11-11",
    completedShortSessions: 0,
    newCardsToday: 0,
    newCardsSuspendedThrough: null,
  };

  it("plans a normal day at the chosen format", () => {
    const plan = planDay(base);
    expect(plan).toMatchObject({ format: 15, resumption: false, readingQuestions: 4, rewriteSentences: 2, momentumWords: 180, workshopCards: 6 });
    expect(plan.workshop?.total).toBe(9);
  });

  it("proposes 10 minutes after an absence, with new cards suspended and 3 workshop cards", () => {
    const plan = planDay({ ...base, lastSessionDay: "2026-11-05" });
    expect(plan).toMatchObject({ format: 10, resumption: true, workshopCards: 3, newCardsSuspendedThrough: "2026-11-13" });
    expect(planDay({ ...base, lastSessionDay: "2026-11-05", formatChosen: true }).format).toBe(15);
  });

  it("makes a catch-up session a 10 minute session and a review-only session the Réveil alone", () => {
    expect(planDay({ ...base, kind: "catch_up", format: 30 }).format).toBe(10);
    const reviewOnly = planDay({ ...base, kind: "review_only" });
    expect(reviewOnly.steps.filter((s) => s.required).map((s) => s.step)).toEqual(["wake"]);
    expect(reviewOnly.workshop).toBeNull();
    expect(reviewOnly.momentumWords).toBeNull();
  });
});

describe("chooseErrorOfDay", () => {
  const list = [
    { id: "a", category: "spelling", correctedNormalized: "x" },
    { id: "b", category: "verb", correctedNormalized: "y" },
    { id: "c", category: "agreement", correctedNormalized: "z" },
  ];

  it("prefers a recurring error of the last 30 days", () => {
    expect(chooseErrorOfDay(list, [{ category: "agreement", correctedNormalized: "z", day: "2026-10-20" }], "2026-11-12")?.id).toBe("c");
    expect(chooseErrorOfDay(list, [{ category: "agreement", correctedNormalized: "z", day: "2026-10-01" }], "2026-11-12")?.id).toBe("b");
  });

  it("otherwise takes the best ranked outside spelling and other, then the first", () => {
    expect(chooseErrorOfDay(list, [], "2026-11-12")?.id).toBe("b");
    expect(chooseErrorOfDay([list[0]!, { id: "o", category: "other", correctedNormalized: "q" }], [], "2026-11-12")?.id).toBe("a");
    expect(chooseErrorOfDay([], [], "2026-11-12")).toBeNull();
  });

  it("keeps an error of the last 7 days workable until it is reworked", () => {
    expect(isErrorWorkable("2026-11-05", null, "2026-11-12")).toBe(true);
    expect(isErrorWorkable("2026-11-04", null, "2026-11-12")).toBe(false);
    expect(isErrorWorkable("2026-11-10", "2026-11-11", "2026-11-12")).toBe(false);
  });
});

describe("adaptive density", () => {
  it("scores right first answers over questions served", () => {
    expect(readingScore(3, 4)).toBe(0.75);
    expect(readingScore(0, 0)).toBe(0);
  });

  it("goes up after 90 % twice, down under 60 %, otherwise stays", () => {
    expect(nextDensity(1, [0.95, 0.9]).density).toBe(2);
    expect(nextDensity(1, [0.5, 0.95]).density).toBe(1);
    expect(nextDensity(2, [0.8, 0.55]).density).toBe(1);
    expect(nextDensity(2, [0.8]).density).toBe(2);
    expect(nextDensity(2, []).density).toBe(2);
  });

  it("keeps dense, with a signal, and serves a dense text of the level below after two drops from light", () => {
    expect(nextDensity(3, [0.9, 1])).toMatchObject({ density: 3, ceilingSignal: true });
    const first = nextDensity(1, [0.4]);
    expect(first).toMatchObject({ density: 1, lightDrops: 1, lowerLevelDense: false });
    expect(nextDensity(1, [0.4], first.lightDrops)).toMatchObject({ density: 3, lowerLevelDense: true, lightDrops: 0 });
  });
});

import type { ReviewRating } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TARGET_RETENTION,
  clampTargetRetention,
  newCardState,
  schedule,
  type MemoryState,
} from "./fsrs";

const NOW = new Date("2026-11-12T10:00:00Z");
const DAY = 86_400_000;

function reviewed(rating: ReviewRating, at: Date = NOW) {
  return schedule(newCardState(at), rating, at);
}

describe("newCardState", () => {
  it("is due now, with no memory", () => {
    expect(newCardState(NOW)).toEqual({
      state: "new",
      stability: null,
      difficulty: null,
      dueAt: NOW,
      lastReviewAt: null,
      reps: 0,
      lapses: 0,
    });
  });
});

describe("clampTargetRetention", () => {
  it("defaults to 0.90 and bounds to 0.80-0.95", () => {
    expect(DEFAULT_TARGET_RETENTION).toBe(0.9);
    expect(clampTargetRetention(undefined)).toBe(0.9);
    expect(clampTargetRetention(Number.NaN)).toBe(0.9);
    expect(clampTargetRetention(0.5)).toBe(0.8);
    expect(clampTargetRetention(0.99)).toBe(0.95);
    expect(clampTargetRetention(0.85)).toBe(0.85);
  });
});

describe("schedule from a new card", () => {
  it("gives memory values and a due date a whole number of days away on 'good'", () => {
    const { state, scheduledDays, elapsedDays } = reviewed(3);
    expect(state.state).toBe("review");
    expect(state.stability).toBeGreaterThan(0);
    expect(state.difficulty).toBeGreaterThanOrEqual(1);
    expect(state.difficulty).toBeLessThanOrEqual(10);
    expect(state.reps).toBe(1);
    expect(state.lapses).toBe(0);
    expect(state.lastReviewAt).toEqual(NOW);
    expect(scheduledDays).toBeGreaterThanOrEqual(1);
    expect(state.dueAt.getTime()).toBe(NOW.getTime() + scheduledDays * DAY);
    expect(elapsedDays).toBe(0);
  });

  it("schedules easier answers further away", () => {
    const days = ([1, 2, 3, 4] as const).map((rating) => reviewed(rating).scheduledDays);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(days[3]).toBeGreaterThan(days[0] as number);
  });

  it("is deterministic (no fuzz)", () => {
    expect(reviewed(3)).toEqual(reviewed(3));
  });
});

describe("schedule from a reviewed card", () => {
  const first = reviewed(3).state;
  const later = new Date(first.dueAt);

  it("grows the stability on success and reports the elapsed days", () => {
    const result = schedule(first, 3, later);
    expect(result.state.stability as number).toBeGreaterThan(first.stability as number);
    expect(result.state.reps).toBe(2);
    expect(result.elapsedDays).toBeCloseTo((later.getTime() - NOW.getTime()) / DAY, 6);
    expect(result.state.lastReviewAt).toEqual(later);
    expect(result.state.dueAt.getTime()).toBeGreaterThan(later.getTime());
  });

  it("counts a lapse and shrinks the stability on 'again'", () => {
    const result = schedule(first, 1, later);
    expect(result.state.lapses).toBe(1);
    expect(result.state.stability as number).toBeLessThan(first.stability as number);
    expect(result.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it("does not mutate its input", () => {
    const snapshot = structuredClone(first);
    schedule(first, 4, later);
    expect(first).toEqual(snapshot);
  });

  it("never reads the clock: the same arguments give the same result", () => {
    expect(schedule(first, 2, later)).toEqual(schedule(first, 2, later));
  });
});

describe("targetRetention", () => {
  const first = reviewed(3).state;
  const later = new Date(first.dueAt);

  it("shortens intervals when higher", () => {
    const relaxed = schedule(first, 3, later, { targetRetention: 0.8 }).scheduledDays;
    const strict = schedule(first, 3, later, { targetRetention: 0.95 }).scheduledDays;
    expect(strict).toBeLessThan(relaxed);
  });

  it("is bounded: out-of-range values behave like the bounds", () => {
    const at = (targetRetention: number) => schedule(first, 3, later, { targetRetention }).scheduledDays;
    expect(at(0.5)).toBe(at(0.8));
    expect(at(0.99)).toBe(at(0.95));
    expect(schedule(first, 3, later).scheduledDays).toBe(at(0.9));
  });
});

describe("schedule refusals", () => {
  const base: MemoryState = { ...newCardState(NOW), stability: 3, difficulty: 5, lastReviewAt: NOW };

  it("does not schedule suspended or known cards", () => {
    expect(() => schedule({ ...base, state: "suspended" }, 3, NOW)).toThrow(RangeError);
    expect(() => schedule({ ...base, state: "known" }, 3, NOW)).toThrow(RangeError);
  });

  it("refuses a started card without memory values", () => {
    expect(() => schedule({ ...base, state: "review", stability: null }, 3, NOW)).toThrow(RangeError);
    expect(() => schedule({ ...base, state: "review", lastReviewAt: null }, 3, NOW)).toThrow(RangeError);
  });
});

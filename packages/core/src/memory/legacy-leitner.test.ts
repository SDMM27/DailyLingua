import { describe, expect, it } from "vitest";
import { toDateKey } from "../dates";
import { schedule } from "./fsrs";
import { LEITNER_INTERVALS_DAYS, leitnerToMemoryState, type LeitnerCard } from "./legacy-leitner";

const PARIS = "Europe/Paris";
const DAY = 86_400_000;

const card = (overrides: Partial<LeitnerCard> = {}): LeitnerCard => ({
  box: 2,
  dueOn: "2026-11-20",
  lastReviewedOn: "2026-11-16",
  reviewCount: 5,
  againCount: 1,
  known: false,
  ...overrides,
});

describe("LEITNER_INTERVALS_DAYS", () => {
  it("is 1, 2, 4, 8, 16, 32, 64 days", () => {
    expect([...LEITNER_INTERVALS_DAYS]).toEqual([1, 2, 4, 8, 16, 32, 64]);
  });
});

describe("leitnerToMemoryState", () => {
  it("documents each box: stability is the interval, difficulty 5.0", () => {
    const expected = [1, 2, 4, 8, 16, 32, 64];
    for (const [box, interval] of expected.entries()) {
      const state = leitnerToMemoryState(card({ box }), PARIS);
      expect(state.stability, `box ${box}`).toBe(interval);
      expect(state.difficulty).toBe(5.0);
      expect(state.state).toBe("review");
    }
  });

  it("clamps a box outside 0..6", () => {
    expect(leitnerToMemoryState(card({ box: -1 }), PARIS).stability).toBe(1);
    expect(leitnerToMemoryState(card({ box: 9 }), PARIS).stability).toBe(64);
  });

  it("is due at 04:00 local on dueOn and last reviewed at 12:00 local", () => {
    const state = leitnerToMemoryState(card(), PARIS);
    expect(state.dueAt.toISOString()).toBe("2026-11-20T03:00:00.000Z");
    expect(state.lastReviewAt?.toISOString()).toBe("2026-11-16T11:00:00.000Z");
  });

  it("keeps the counters: reps from the review count, lapses from the 'again' count", () => {
    const state = leitnerToMemoryState(card({ reviewCount: 12, againCount: 3 }), PARIS);
    expect(state.reps).toBe(12);
    expect(state.lapses).toBe(3);
  });

  it("is 'new' without any review, with no last review date", () => {
    const state = leitnerToMemoryState(card({ box: 0, lastReviewedOn: null, reviewCount: 0, againCount: 0 }), PARIS);
    expect(state.state).toBe("new");
    expect(state.lastReviewAt).toBeNull();
  });

  it("stays 'known' for a word set aside, reviewed or not", () => {
    expect(leitnerToMemoryState(card({ known: true }), PARIS).state).toBe("known");
    expect(leitnerToMemoryState(card({ known: true, lastReviewedOn: null }), PARIS).state).toBe("known");
  });

  it("never makes a card due earlier: its local due day is dueOn in every zone", () => {
    for (const timeZone of [PARIS, "Asia/Tokyo", "America/Los_Angeles"]) {
      for (const dueOn of ["2026-03-29", "2026-10-25", "2026-11-08", "2026-11-20"]) {
        const state = leitnerToMemoryState(card({ dueOn }), timeZone);
        expect(toDateKey(state.dueAt, timeZone), `${timeZone} ${dueOn}`).toBe(dueOn);
      }
    }
  });

  it("uses the profile time zone", () => {
    expect(leitnerToMemoryState(card(), "Asia/Tokyo").dueAt.toISOString()).toBe("2026-11-19T19:00:00.000Z");
    expect(leitnerToMemoryState(card(), "America/Los_Angeles").dueAt.toISOString()).toBe("2026-11-20T12:00:00.000Z");
  });
});

describe("a converted card answered 'good'", () => {
  it("gets an interval of at least one day and a later due date, for every box", () => {
    for (const box of [0, 1, 2, 3, 4, 5, 6]) {
      const converted = leitnerToMemoryState(card({ box, dueOn: "2026-11-20", lastReviewedOn: "2026-11-19" }), PARIS);
      // Answered when it falls due.
      const now = converted.dueAt;
      const result = schedule(converted, 3, now);
      expect(result.scheduledDays, `box ${box}`).toBeGreaterThanOrEqual(1);
      expect(result.state.dueAt.getTime(), `box ${box}`).toBeGreaterThan(converted.dueAt.getTime());
      expect(result.state.dueAt.getTime()).toBe(now.getTime() + result.scheduledDays * DAY);
    }
  });
});

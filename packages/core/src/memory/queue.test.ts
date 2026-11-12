import type { CardState } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { capQueue, dueCards, spreadBacklog } from "./queue";

const NOW = new Date("2026-11-12T10:00:00Z");
const DAY = 86_400_000;

let n = 0;
const card = (dueOffsetDays: number, state: CardState = "review") => ({
  id: `c${n++}`,
  state,
  dueAt: new Date(NOW.getTime() + dueOffsetDays * DAY),
});

describe("dueCards", () => {
  it("keeps cards due now or before, most overdue first", () => {
    const [today, late, veryLate, tomorrow] = [card(0), card(-2), card(-9), card(1)];
    expect(dueCards([today, late, tomorrow, veryLate], NOW)).toEqual([veryLate, late, today]);
  });

  it("leaves out suspended and known cards", () => {
    const due = card(-1);
    expect(dueCards([due, card(-1, "suspended"), card(-1, "known")], NOW)).toEqual([due]);
  });

  it("keeps new, learning and relearning cards", () => {
    const cards = (["new", "learning", "relearning"] as const).map((state) => card(-1, state));
    expect(dueCards(cards, NOW)).toHaveLength(3);
  });

  it("keeps the order of equal due dates and does not mutate", () => {
    const [a, b, c] = [card(-1), card(-1), card(-1)];
    const input = [c, a, b];
    expect(dueCards(input, NOW)).toEqual([c, a, b]);
    expect(input).toEqual([c, a, b]);
  });

  it("is empty for nothing", () => {
    expect(dueCards([], NOW)).toEqual([]);
  });
});

describe("capQueue", () => {
  const queue = Array.from({ length: 50 }, (_, i) => i);

  it("keeps what fits in the time budget", () => {
    expect(capQueue(queue, { maxMinutes: 5, secondsPerCard: 30 })).toHaveLength(10);
    expect(capQueue(queue, { maxMinutes: 5, secondsPerCard: 40 })).toHaveLength(7); // 7.5 rounded down
  });

  it("keeps the head of the queue, in order", () => {
    expect(capQueue(queue, { maxMinutes: 1, secondsPerCard: 20 })).toEqual([0, 1, 2]);
  });

  it("returns everything when the budget is larger than the queue", () => {
    expect(capQueue(queue, { maxMinutes: 120, secondsPerCard: 10 })).toHaveLength(50);
  });

  it("returns nothing for a nil or invalid budget", () => {
    expect(capQueue(queue, { maxMinutes: 0, secondsPerCard: 30 })).toEqual([]);
    expect(capQueue(queue, { maxMinutes: 5, secondsPerCard: 0 })).toEqual([]);
    expect(capQueue(queue, { maxMinutes: -5, secondsPerCard: 30 })).toEqual([]);
  });
});

describe("spreadBacklog", () => {
  it("spreads the overdue cards in even shares, the most overdue first", () => {
    const backlog = Array.from({ length: 30 }, (_, i) => card(-30 + i));
    const spread = spreadBacklog(backlog, NOW, { days: 3 });
    const share = (day: number) => spread.filter((c) => c.dueAt.getTime() === NOW.getTime() + day * DAY).length;
    // The first share keeps its own (past) due dates; days 1 and 2 hold 10 cards each.
    expect(share(1)).toBe(10);
    expect(share(2)).toBe(10);
    expect(spread.filter((c) => c.dueAt.getTime() <= NOW.getTime())).toHaveLength(10);
    // The 10 most overdue stay due now.
    expect(spread.slice(0, 10).every((c, i) => c.dueAt.getTime() === backlog[i]?.dueAt.getTime())).toBe(true);
  });

  it("never advances a due date", () => {
    const backlog = [card(-40), card(-3), card(-1), card(0), card(2), card(15), card(-5, "suspended")];
    const spread = spreadBacklog(backlog, NOW, { days: 5 });
    spread.forEach((c, i) => expect(c.dueAt.getTime()).toBeGreaterThanOrEqual((backlog[i] as { dueAt: Date }).dueAt.getTime()));
  });

  it("leaves cards that are not overdue, suspended or known unchanged", () => {
    const future = card(3);
    const suspended = card(-4, "suspended");
    const known = card(-4, "known");
    const spread = spreadBacklog([future, suspended, known, card(-1), card(-2)], NOW, { days: 4 });
    expect(spread[0]).toBe(future);
    expect(spread[1]).toBe(suspended);
    expect(spread[2]).toBe(known);
  });

  it("keeps the input order and does not mutate", () => {
    const backlog = [card(-1), card(-3), card(-2)];
    const before = backlog.map((c) => c.dueAt.getTime());
    const spread = spreadBacklog(backlog, NOW, { days: 3 });
    expect(spread.map((c) => c.id)).toEqual(backlog.map((c) => c.id));
    expect(backlog.map((c) => c.dueAt.getTime())).toEqual(before);
  });

  it("changes nothing over a single day, or for a day count below 1", () => {
    const backlog = [card(-1), card(-2)];
    expect(spreadBacklog(backlog, NOW, { days: 1 })).toEqual(backlog);
    expect(spreadBacklog(backlog, NOW, { days: 0 })).toEqual(backlog);
  });

  it("handles an empty queue", () => {
    expect(spreadBacklog([], NOW, { days: 3 })).toEqual([]);
  });
});

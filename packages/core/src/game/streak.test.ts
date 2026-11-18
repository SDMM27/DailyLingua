import type { DateKey } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { buildSettingsHistory, dayStatuses, recomputeStreak, type SettingChange, type StreakInput } from "./index";

// 2026-11-02, 11-09 and 11-16 are Mondays.
const MON1 = "2026-11-02";
const MON2 = "2026-11-09";
const MON3 = "2026-11-16";
const week = (monday: DateKey): DateKey[] => Array.from({ length: 7 }, (_, i) => addDays(monday, i));
const d = (monday: DateKey, offset: number): DateKey => addDays(monday, offset);

const change = (key: SettingChange["key"], value: unknown, effectiveDay: DateKey, changedAt = "2026-11-01T00:00:00Z"): SettingChange => ({ key, value, effectiveDay, changedAt });

function run(params: {
  validated?: DateKey[];
  travel?: DateKey[];
  catchUps?: DateKey[];
  changes?: SettingChange[];
  goalMet?: DateKey[];
  firstDay?: DateKey;
  today: DateKey;
}) {
  const rows = [
    ...(params.validated ?? []).map((day) => ({ day, validated: true, cause: "work" })),
    ...(params.travel ?? []).map((day) => ({ day, validated: false, cause: "travel" })),
  ];
  const input: StreakInput = {
    status: dayStatuses(rows),
    history: buildSettingsHistory(params.changes ?? []),
    catchUps: params.catchUps ?? [],
    weekGoalMet: (monday) => (params.goalMet ?? []).includes(monday),
    firstDay: params.firstDay ?? MON1,
    today: params.today,
  };
  return recomputeStreak(input);
}

describe("recomputeStreak: the daily streak", () => {
  it("counts consecutive validated days and tracks the best", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 2)], today: d(MON1, 2) });
    expect(result).toMatchObject({ current: 3, best: 3, bestSetOn: d(MON1, 2), freezes: 1, lastDay: d(MON1, 2), lastRepairDay: null });
  });

  it("never misses the day in progress", () => {
    const result = run({ validated: [d(MON1, 0)], today: d(MON1, 1) });
    expect(result).toMatchObject({ current: 1, freezes: 1, events: [] });
  });

  it("starts with a freeze and consumes it on the first missed day, which stays neutral", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 3)], today: d(MON1, 3) });
    expect(result).toMatchObject({ current: 3, freezes: 0 });
    expect(result.events).toEqual([{ kind: "freeze_used", day: d(MON1, 2) }]);
  });

  it("does not consume a freeze when there is no streak to protect", () => {
    const result = run({ validated: [d(MON1, 3)], today: d(MON1, 3) });
    expect(result).toMatchObject({ current: 1, freezes: 1, events: [] });
  });

  it("waits two days for a repair, then resets", () => {
    const base = { validated: [d(MON1, 0), d(MON1, 1)], firstDay: MON1 };
    // Day 2 is frozen (the one freeze); day 3 is missed with no freeze left.
    const waiting = run({ ...base, today: d(MON1, 5) });
    expect(waiting.current).toBe(2);
    expect(waiting.events).toEqual([{ kind: "freeze_used", day: d(MON1, 2) }]);
    const reset = run({ ...base, today: d(MON1, 6) });
    expect(reset.current).toBe(0);
    expect(reset.best).toBe(2);
    expect(reset.events).toContainEqual({ kind: "streak_reset", day: d(MON1, 3), length: 2 });
  });

  it("repairs a missed day with a complete catch-up session on the day after, itself validated", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 4)], catchUps: [d(MON1, 4)], today: d(MON1, 4) });
    // Day 2 frozen, day 3 repaired (catch-up on day 4), day 4 validated by its own work.
    expect(result.current).toBe(4);
    expect(result.lastRepairDay).toBe(d(MON1, 4));
    expect(result.events).toContainEqual({ kind: "streak_repaired", day: d(MON1, 3) });
  });

  it("repairs two days later when the day in between is covered, not otherwise", () => {
    // Day 2 frozen, day 3 missed, day 4 worked (covered), catch-up on day 5: day 3 is repaired.
    const covered = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 4), d(MON1, 5)], catchUps: [d(MON1, 5)], today: d(MON1, 5) });
    expect(covered.events).toContainEqual({ kind: "streak_repaired", day: d(MON1, 3) });
    // Days 3 and 4 both missed: the catch-up on day 5 cannot reach day 3 (day 4 is a hole), it repairs day 4 only.
    const hole = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 5)], catchUps: [d(MON1, 5)], today: d(MON1, 5) });
    expect(hole.events.filter((event) => event.kind === "streak_repaired")).toEqual([{ kind: "streak_repaired", day: d(MON1, 4) }]);
  });

  it("repairs at most once in 30 days", () => {
    const first = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 4)], catchUps: [d(MON1, 4)], today: d(MON1, 4) });
    expect(first.lastRepairDay).toBe(d(MON1, 4));
    // Another hole 6 days later, catch-up on the next day: too soon after the first repair.
    const days = [d(MON1, 0), d(MON1, 1), d(MON1, 4), d(MON1, 5), d(MON1, 7), d(MON1, 8)];
    const second = run({ validated: days, catchUps: [d(MON1, 4), d(MON1, 8)], goalMet: [], today: d(MON1, 12) });
    expect(second.events.filter((event) => event.kind === "streak_repaired")).toHaveLength(1);
  });

  it("hands out the freezes on Monday: earned first (stock under 3), then the gift (stock under 2)", () => {
    // Stock 1 at the start. Monday 9: the goal of the week 2-8 was met: +1 earned (2), no gift since 2 is not < 2.
    const earned = run({ validated: week(MON1), goalMet: [MON1], today: MON2 });
    expect(earned.freezes).toBe(2);
    expect(earned.events).toEqual([{ kind: "freeze_granted", day: MON2, source: "earned" }]);
    expect(earned.freezesGrantedThrough).toBe(MON2);
    // Goal not met, stock 1: only the gift (2).
    const gift = run({ validated: week(MON1), today: MON2 });
    expect(gift.freezes).toBe(2);
    expect(gift.events).toEqual([{ kind: "freeze_granted", day: MON2, source: "gift" }]);
    // At 2 the gift stops: Monday 16 gives nothing (no goal met).
    const stock = run({ validated: [...week(MON1), ...week(MON2)], today: MON3 });
    expect(stock.freezes).toBe(2);
  });

  it("caps the stock at 3", () => {
    const result = run({ validated: [...week(MON1), ...week(MON2), ...week(MON3)], goalMet: [MON1, MON2, MON3], today: addDays(MON3, 7) });
    expect(result.freezes).toBe(3);
  });

  it("does not hand out a freeze on the very first day", () => {
    expect(run({ validated: [MON1], firstDay: MON1, today: MON1 }).freezes).toBe(1);
  });

  it("is neutral on travel days and on rest days", () => {
    const travel = run({ validated: [d(MON1, 0), d(MON1, 2)], travel: [d(MON1, 1)], today: d(MON1, 2) });
    expect(travel).toMatchObject({ current: 2, freezes: 1, events: [] });
    const rest = run({
      validated: [d(MON1, 0), d(MON1, 1), d(MON1, 2), d(MON1, 3), d(MON1, 4), d(MON1, 7)],
      changes: [change("streak.restDays", [6, 7], MON1)],
      today: d(MON1, 7),
    });
    // Saturday and Sunday are not worked: neutral, no freeze used.
    expect(rest).toMatchObject({ current: 6, freezes: 2 }); // the gift of Monday, nothing consumed
    expect(rest.events.filter((event) => event.kind === "freeze_used")).toEqual([]);
  });

  it("counts a rest day that is worked", () => {
    const result = run({ validated: [d(MON1, 4), d(MON1, 5)], changes: [change("streak.restDays", [6], MON1)], today: d(MON1, 5) });
    expect(result.current).toBe(2);
  });

  it("makes a rest day effective on the effective day only, never backwards", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 1)], changes: [change("streak.restDays", [3], d(MON1, 3))], today: d(MON1, 6) });
    // Wednesday (day 2) was missed before the rest day took effect: frozen. Next Wednesday would be neutral.
    expect(result.events).toContainEqual({ kind: "freeze_used", day: d(MON1, 2) });
  });

  it("keeps the streak where it was while the series is off: neutral days, no freeze consumed or granted", () => {
    const off = [change("streak.enabled", false, d(MON1, 2)), change("streak.enabled", true, d(MON1, 10))];
    const result = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 10)], changes: off, today: d(MON1, 10) });
    expect(result.current).toBe(3);
    expect(result.freezes).toBe(1);
    expect(result.events).toEqual([]);
  });
});

describe("recomputeStreak: the weekly streak", () => {
  const weekly = [change("streak.mode", "weekly", MON1), change("streak.weeklyTarget", 3, MON1)];

  it("validates a week once its target of days is reached, the current week included", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 2), d(MON1, 4), d(MON2, 0), d(MON2, 1), d(MON2, 2)], changes: weekly, today: d(MON2, 2) });
    expect(result.currentWeeks).toBe(2);
    expect(result.bestWeeks).toBe(2);
  });

  it("does not count the current week before its target is reached", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 2), d(MON1, 4), d(MON2, 0)], changes: weekly, today: d(MON2, 1) });
    expect(result.currentWeeks).toBe(1);
  });

  it("resets the weeks, and the days counter, when a week closes short, and keeps the best", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 2), d(MON1, 4), d(MON2, 0)], changes: weekly, today: d(MON3, 1) });
    expect(result.currentWeeks).toBe(0);
    expect(result.bestWeeks).toBe(1);
    expect(result.current).toBe(0);
  });

  it("uses neither freeze, repair nor rest day", () => {
    const result = run({ validated: [d(MON1, 0), d(MON1, 2), d(MON1, 4)], changes: [...weekly, change("streak.restDays", [6, 7], MON1)], today: d(MON1, 6) });
    expect(result.freezes).toBe(1);
    expect(result.events).toEqual([]);
  });
});

describe("recomputeStreak: determinism", () => {
  const validated = [d(MON1, 0), d(MON1, 1), d(MON1, 4), d(MON2, 0), d(MON2, 1), d(MON2, 2), d(MON2, 4)];
  const base = { validated, catchUps: [d(MON1, 4)], goalMet: [MON1], today: d(MON2, 5) };

  it("gives the same state when replayed", () => {
    expect(run(base)).toEqual(run(base));
  });

  it("does not depend on the order the rows, the catch-ups or the changes arrived in", () => {
    const changes = [change("streak.restDays", [7], MON1, "2026-11-01T10:00:00Z"), change("ring.tier", 20, MON1, "2026-11-01T11:00:00Z")];
    const forward = run({ ...base, changes });
    const reversed = run({ ...base, validated: [...validated].reverse(), catchUps: [...base.catchUps].reverse(), changes: [...changes].reverse() });
    expect(reversed).toEqual(forward);
    const shuffled = run({ ...base, validated: [validated[3]!, validated[0]!, validated[6]!, validated[1]!, validated[5]!, validated[2]!, validated[4]!] });
    expect(shuffled).toEqual(run(base));
  });

  it("takes the earliest catch-up when two are in reach, whatever their order", () => {
    const a = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 3), d(MON1, 4)], catchUps: [d(MON1, 4), d(MON1, 3)], today: d(MON1, 4) });
    const b = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 3), d(MON1, 4)], catchUps: [d(MON1, 3), d(MON1, 4)], today: d(MON1, 4) });
    expect(a).toEqual(b);
  });

  it("refunds a freeze when a day arrives late but on time (71 h), keeps it consumed otherwise", () => {
    // Day 2 is missed at first (freeze used). Its work arrives later: the recompute refunds the freeze.
    const missing = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 3)], today: d(MON1, 3) });
    expect(missing).toMatchObject({ current: 3, freezes: 0 });
    const arrived = run({ validated: [d(MON1, 0), d(MON1, 1), d(MON1, 2), d(MON1, 3)], today: d(MON1, 3) });
    expect(arrived).toMatchObject({ current: 4, freezes: 1 });
  });
});

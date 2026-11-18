import type { StateDay } from "@dailylingua/core";
import { stateDaySchema, type IngestMemo, type StateDayValue } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";

/**
 * `packages/schemas` cannot import `packages/core`, so the counters of a day are written twice: `StateDay` (core) and
 * `stateDaySchema` (schemas). The two must stay the same type: these assignments fail to compile when one moves
 * without the other, in either direction.
 */
const fromCore = (day: StateDay): StateDayValue => day;
const toCore = (day: StateDayValue): StateDay => day;

type MemoDay = IngestMemo["days"][string];
const memoDayFromCore = (day: StateDay): MemoDay => day;
const memoDayToCore = (day: MemoDay): StateDay => day;

describe("StateDay of core and stateDaySchema", () => {
  it("are the same type (compile-time) and a core day passes the schema", () => {
    const day: StateDay = { xpByReason: { "review.production": 2 }, reviewSuccesses: 1, newCards: 0, readingTexts: 0, rewards: {}, focusBySession: {}, rewardsByCorrection: {}, counted: ["review:x"] };
    expect(stateDaySchema.parse(fromCore(day))).toEqual(day);
    expect(toCore(day)).toBe(day);
    expect(memoDayToCore(memoDayFromCore(day))).toBe(day);
    // Same keys: a field added on one side only would make the strict schema reject a day of the other.
    expect(Object.keys(stateDaySchema.shape).sort()).toEqual(Object.keys(day).sort());
  });
});

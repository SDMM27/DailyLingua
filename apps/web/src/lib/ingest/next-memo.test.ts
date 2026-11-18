import type { IngestState } from "@dailylingua/core";
import type { IngestMemo } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { OTHER, USER, uuid } from "@/test/ingest-rows";
import { buildNextMemo, jsonbTextBytes, MemoTooLargeError } from "./next-memo";

const DAY = {
  xpByReason: {},
  reviewSuccesses: 1,
  newCards: 0,
  readingTexts: 0,
  rewards: {},
  focusBySession: {},
  rewardsByCorrection: {},
  counted: [],
};
const state = (overrides: Partial<IngestState> = {}): IngestState =>
  ({ userId: USER, days: {}, texts: {}, productions: {}, catchUpDays: [], ...overrides }) as unknown as IngestState;

describe("buildNextMemo", () => {
  it("keeps the days from the server day - 10 to + 1 only", () => {
    const days = { "2026-11-07": DAY, "2026-11-08": DAY, "2026-11-18": DAY, "2026-11-19": DAY, "2026-11-20": DAY };
    const memo = buildNextMemo(null, state({ days }), "2026-11-18");
    expect(Object.keys(memo.days).sort()).toEqual(["2026-11-08", "2026-11-18", "2026-11-19"]);
  });

  it("overlays the texts of the batch on the ones the memo knew, newest first, 200 at most", () => {
    const previous: IngestMemo = { v: 1, days: {}, texts: { [uuid(1)]: { readingEarnedDay: "2026-11-01", referenceWpm: 150 } }, productions: {}, catchUpDays: [] };
    const next = state({
      texts: {
        [uuid(1)]: { id: uuid(1), readingEarnedDay: "2026-11-17", referenceWpm: 150 },
        [uuid(2)]: { id: uuid(2), readingEarnedDay: "2026-11-16", referenceWpm: 200 },
        [uuid(3)]: { id: uuid(3), readingEarnedDay: null, referenceWpm: null },
      } as unknown as IngestState["texts"],
    });
    const memo = buildNextMemo(previous, next, "2026-11-18");
    expect(memo.texts).toEqual({ [uuid(1)]: { readingEarnedDay: "2026-11-17", referenceWpm: 150 }, [uuid(2)]: { readingEarnedDay: "2026-11-16", referenceWpm: 200 } });

    const many = Object.fromEntries(Array.from({ length: 260 }, (_, i) => [uuid(1000 + i), { readingEarnedDay: `2026-0${1 + (i % 9)}-01`, referenceWpm: 100 }]));
    const capped = buildNextMemo({ ...previous, texts: many }, state(), "2026-11-18");
    expect(Object.keys(capped.texts)).toHaveLength(200);
  });

  it("keeps the productions not settled, and the ones settled less than 10 days ago", () => {
    const production = (id: string, day: string, settled: boolean) => [id, { id, day, late: false, settled, correctionDeferred: false }] as const;
    const next = state({
      productions: Object.fromEntries([
        production(uuid(1), "2026-10-01", false),
        production(uuid(2), "2026-10-01", true),
        production(uuid(3), "2026-11-10", true),
        production(uuid(4), "2026-11-17", false),
      ]) as unknown as IngestState["productions"],
    });
    const memo = buildNextMemo(null, next, "2026-11-18");
    expect(Object.keys(memo.productions).sort()).toEqual([uuid(1), uuid(3), uuid(4)].sort());
    expect(memo.productions[uuid(1)]).toEqual({ day: "2026-10-01", late: false, settled: false, correctionDeferred: false });
  });

  it("keeps the catch-up days of the last 60 days, from the memo and the state, once each", () => {
    const previous: IngestMemo = { v: 1, days: {}, texts: {}, productions: {}, catchUpDays: ["2026-09-01", "2026-10-01"] };
    const memo = buildNextMemo(previous, state({ catchUpDays: ["2026-10-01", "2026-11-10"] }), "2026-11-18");
    expect(memo.catchUpDays).toEqual(["2026-10-01", "2026-11-10"]);
  });

  it("fails loudly when the memo is over 256 KiB, never cuts it short", () => {
    const counted = Array.from({ length: 6000 }, (_, i) => `review:${uuid(i)}`);
    const days = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-11-${String(8 + i).padStart(2, "0")}`, { ...DAY, counted }]));
    expect(() => buildNextMemo(null, state({ days }), "2026-11-18")).toThrow(MemoTooLargeError);
  });

  it("does not hold a user id or another user's data", () => {
    expect(JSON.stringify(buildNextMemo(null, state(), "2026-11-18"))).not.toContain(OTHER);
  });
});

describe("jsonbTextBytes", () => {
  it("counts the spaces jsonb prints after a colon and a comma, not the ones inside strings", () => {
    expect(jsonbTextBytes({ a: 1, b: [1, 2] })).toBe('{"a": 1, "b": [1, 2]}'.length);
    expect(jsonbTextBytes({ a: "x:y,z" })).toBe('{"a": "x:y,z"}'.length);
    expect(jsonbTextBytes({ a: 'quote"colon:' })).toBe('{"a": "quote\\"colon:"}'.length);
  });
});

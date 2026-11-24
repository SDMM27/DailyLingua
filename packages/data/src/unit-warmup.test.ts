import { describe, expect, it } from "vitest";
import { tableFake } from "./table-fake";
import { getLastFailedTest, getPendingWarmups, getUnitXp } from "./unit-warmup";

const USER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const UNIT = "it-a1-01-saluer";
const OTHER_UNIT = "it-a1-02-caffe";

const test = (id: string, unit: string, passed: boolean, missed: string[], at: string, user = USER) => ({
  id, user_id: user, unit_id: unit, version: "0123456789ab", score: passed ? 9 : 6, passed, missed, created_at: at,
});
const attempt = (id: number, unit: string, itemId: string, correct: boolean, at: string, kind = "unit_mcq", user = USER) => ({
  id, user_id: user, exercise_kind: kind, answer: { unitId: unit, itemId }, correct, occurred_at: at,
});
const progress = (unit: string, passedAt: string | null) => ({
  user_id: USER, unit_id: unit, language: "it", version: "0123456789ab", steps: {}, best_score: null, test_attempts: 1, passed_at: passedAt, passed_version: passedAt ? "0123456789ab" : null, updated_at: "2026-11-20T10:00:00Z",
});

describe("getLastFailedTest", () => {
  it("returns the newest failed test of the unit, and null when there is none", async () => {
    const { client } = tableFake({
      unit_test: [
        test("a", UNIT, false, ["i1"], "2026-11-20T10:00:00Z"),
        test("b", UNIT, false, ["i2", "i3"], "2026-11-21T10:00:00Z"),
        test("c", UNIT, true, [], "2026-11-22T10:00:00Z"),
        test("d", OTHER_UNIT, false, ["i9"], "2026-11-23T10:00:00Z"),
      ],
    });
    expect(await getLastFailedTest(client, USER, UNIT)).toMatchObject({ id: "b", missed: ["i2", "i3"], unitId: UNIT });
    expect(await getLastFailedTest(client, USER, "it-a1-03-prezzi")).toBeNull();
    expect(await getLastFailedTest(client, OTHER, UNIT)).toBeNull();
  });
});

describe("getPendingWarmups", () => {
  it("lists the missed items of the last failed test that were not answered right since", async () => {
    const { client } = tableFake({
      unit_progress: [progress(UNIT, null)],
      unit_test: [
        test("old", UNIT, false, ["i1"], "2026-11-19T10:00:00Z"),
        test("last", UNIT, false, ["i2", "i3", "i4"], "2026-11-20T10:00:00Z"),
      ],
      attempt: [
        attempt(1, UNIT, "i2", true, "2026-11-19T09:00:00Z"), // before the test: does not count
        attempt(2, UNIT, "i3", true, "2026-11-21T08:00:00Z"), // right since: done
        attempt(3, UNIT, "i4", false, "2026-11-21T08:01:00Z"), // wrong: still to do
        attempt(4, UNIT, "i2", true, "2026-11-21T08:02:00Z", "unit_cloze", OTHER), // somebody else's
        attempt(5, OTHER_UNIT, "i2", true, "2026-11-21T08:03:00Z"), // another unit
      ],
    });
    expect(await getPendingWarmups(client, USER, "it")).toEqual([
      { unitId: UNIT, version: "0123456789ab", testId: "last", testedAt: "2026-11-20T10:00:00Z", itemIds: ["i2", "i4"] },
    ]);
  });

  it("leaves out a passed unit, a unit whose missed items are all right, other languages and other learners", async () => {
    const { client } = tableFake({
      unit_progress: [progress(UNIT, "2026-11-22T10:00:00Z")],
      unit_test: [
        test("t1", UNIT, false, ["i1"], "2026-11-20T10:00:00Z"),
        test("t2", OTHER_UNIT, false, ["i5"], "2026-11-20T10:00:00Z"),
        test("t3", "ru-a1-01-privet", false, ["i7"], "2026-11-20T10:00:00Z"),
        test("t4", "it-a1-03-prezzi", false, ["i8"], "2026-11-20T10:00:00Z", OTHER),
      ],
      attempt: [attempt(1, OTHER_UNIT, "i5", true, "2026-11-21T08:00:00Z")],
    });
    expect(await getPendingWarmups(client, USER, "it")).toEqual([]);
  });

  it("reads through the learner's own rows only (explicit user filter)", async () => {
    const { client, queries } = tableFake({ unit_progress: [], unit_test: [test("t", UNIT, false, ["i1"], "2026-11-20T10:00:00Z")], attempt: [] });
    await getPendingWarmups(client, USER, "it");
    for (const query of queries) expect(query.chain.some((step) => step.startsWith(`eq("user_id",${JSON.stringify(USER)}`))).toBe(true);
  });
});

describe("getUnitXp", () => {
  it("sums the focus lines of the attempts of the unit, not the test bonus nor another unit", async () => {
    const { client } = tableFake({
      attempt: [attempt(1, UNIT, "i1", true, "t"), attempt(2, UNIT, "i2", true, "t"), attempt(3, OTHER_UNIT, "i1", true, "t"), attempt(4, UNIT, "i3", true, "t", "unit_mcq", OTHER)],
      xp_ledger: [
        { user_id: USER, attempt_id: 1, reason: "focus.first_try", amount: 2 },
        { user_id: USER, attempt_id: 2, reason: "focus.second_try", amount: 1 },
        { user_id: USER, attempt_id: 3, reason: "focus.first_try", amount: 2 },
        { user_id: USER, attempt_id: null, reason: "unit.complete", amount: 25 },
        { user_id: USER, attempt_id: 1, reason: "unit.complete", amount: 25 },
      ],
    });
    expect(await getUnitXp(client, USER, UNIT)).toBe(3);
    expect(await getUnitXp(client, USER, "it-a1-09-nope")).toBe(0);
  });
});

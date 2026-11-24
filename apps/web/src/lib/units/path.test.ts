import { getUnit, unitsFor } from "@dailylingua/content";
import { describe, expect, it } from "vitest";
import { buildPath, hasPath, isPathLevel, minutesLeft, warmupDue } from "./path";
import type { UnitProgressView } from "./progress";
import { BILAN_ID, testBilan } from "./test-bilan";

// The situation units only: the bilan, last of the path, has its own zone heading (tested with `test-bilan`).
const units = unitsFor("it").filter((unit) => unit.kind !== "assessment");
const [first] = units;
const view = (patch: Partial<UnitProgressView> = {}): UnitProgressView => ({ steps: {}, bestScore: null, testAttempts: 0, passedAt: null, ...patch });
const fr = { locale: "fr" as const };

describe("who gets the path", () => {
  it("is for the levels A0 to A2 with at least one visible unit", () => {
    expect(isPathLevel([{ levelValue: 0 }, { levelValue: 0.5 }])).toBe(true);
    expect(isPathLevel([{ levelValue: 5 }])).toBe(false);
    expect(isPathLevel([])).toBe(false);
    expect(hasPath([{ levelValue: 0 }], [first])).toBe(true);
    expect(hasPath([{ levelValue: 0 }], [])).toBe(false);
    expect(hasPath([{ levelValue: 5 }], [first])).toBe(false);
  });
});

describe("buildPath", () => {
  it("makes the first unit current on day one, with no zone heading for situations alone", () => {
    const path = buildPath(units, new Map(), fr);
    const stations = path.entries.filter((entry) => entry.type === "station");
    expect(path.entries.some((entry) => entry.type === "zone")).toBe(false);
    expect(path).toMatchObject({ done: 0, total: units.length, currentId: first!.id, hasWriting: false });
    expect(stations[0]).toMatchObject({ status: "current", number: 1, started: false, step: { position: 1 } });
    for (const station of stations.slice(1)) expect(station.status).toBe("todo");
  });

  it("marks a passed unit done and the next one current; a unit passed by the test alone says so", () => {
    const passedByTest = new Map([[first!.id, view({ passedAt: "2026-11-20T10:00:00Z", bestScore: 9 })]]);
    const path = buildPath(units, passedByTest, { ...fr, passedOn: () => "20 nov." });
    const [one, two] = path.entries.filter((entry) => entry.type === "station");
    expect(one).toMatchObject({ status: "done", passedByTest: true, passedOn: "20 nov." });
    if (units.length > 1) expect(two).toMatchObject({ status: "current" });
    expect(path.done).toBe(1);
  });

  it("follows the current unit's own progress, and carries the warm-up count", () => {
    const stamp = "2026-11-23T10:00:00Z";
    const path = buildPath(units, new Map([[first!.id, view({ steps: { "l1:dialogue": stamp, "l1:key_phrases": stamp } })]]), { ...fr, warmups: new Map([[first!.id, 3]]) });
    expect(path.entries.find((entry) => entry.type === "station")).toMatchObject({ status: "current", started: true, step: { position: 3, key: "grammar" }, warmup: 3 });
  });

  it("puts a zone heading before each kind when the path has writing units", () => {
    const script = { ...getUnit("it-a1-01-saluer")!, id: "it-a0-00-fake", kind: "script" as const, level: "A0" as const, order: 0, letters: [{ upper: "Б" }] } as never;
    const path = buildPath([script, first!], new Map(), fr);
    expect(path.entries.map((entry) => (entry.type === "zone" ? `zone:${entry.zone}:${entry.level}` : entry.id))).toEqual(["zone:writing:A0", "it-a0-00-fake", "zone:situations:A1", first!.id]);
    expect(path).toMatchObject({ hasWriting: true, currentIsWriting: true, level: "A0" });
  });

  it("ends the path with the bilan under its own zone heading, even without writing units", () => {
    const { bilan, sources } = testBilan();
    const path = buildPath([...sources, bilan], new Map(), fr);
    expect(path.entries.map((entry) => (entry.type === "zone" ? `zone:${entry.zone}:${entry.level}` : entry.id))).toEqual([...sources.map((unit) => unit.id), "zone:assessment:A1", BILAN_ID]);
    expect(path.entries.at(-1)).toMatchObject({ kind: "assessment", status: "todo", testSize: 10, started: false, passedByTest: false, number: 6 });
    expect(path.confirmed).toBe(false);
  });

  it("makes the bilan current after the last unit, and confirms the level once the bilan is passed", () => {
    const { bilan, sources } = testBilan();
    const passed = (id: string) => [id, view({ passedAt: "2026-11-20T10:00:00Z" })] as const;
    const before = buildPath([...sources, bilan], new Map(sources.map((unit) => passed(unit.id))), fr);
    expect(before).toMatchObject({ currentId: BILAN_ID, confirmed: false, level: "A1", done: 5, total: 6 });
    const after = buildPath([...sources, bilan], new Map([...sources, bilan].map((unit) => passed(unit.id))), fr);
    expect(after).toMatchObject({ currentId: null, confirmed: true, done: 6 });
    expect(after.entries.at(-1)).toMatchObject({ kind: "assessment", status: "done", passedByTest: false });
  });

  it("confirms the bilan's level even when an A0 writing unit is still current (the order is not locked)", () => {
    const ru = unitsFor("ru");
    const bilanRu = ru.find((unit) => unit.kind === "assessment");
    expect(bilanRu).toBeDefined();
    const path = buildPath(ru, new Map([[bilanRu!.id, view({ passedAt: "2026-11-20T10:00:00Z" })]]), fr);
    expect(path).toMatchObject({ confirmed: true, level: "A1", currentIsWriting: true });
  });

  it("keeps the last level when everything is done", () => {
    const all = new Map(units.map((unit) => [unit.id, view({ passedAt: "2026-11-20T10:00:00Z" })]));
    expect(buildPath(units, all, fr)).toMatchObject({ currentId: null, done: units.length });
  });
});

describe("warmupDue", () => {
  it("starts on the learning day after the test, in the learner's time zone (the day begins at 4 am)", () => {
    const testedAt = "2026-11-20T21:30:00Z"; // 22:30 in Paris
    expect(warmupDue(testedAt, new Date("2026-11-21T01:00:00Z"), "Europe/Paris")).toBe(false); // 02:00, still the same learning day
    expect(warmupDue(testedAt, new Date("2026-11-21T03:30:00Z"), "Europe/Paris")).toBe(true); // 04:30
    expect(warmupDue(testedAt, new Date("2026-11-20T23:00:00Z"), "Europe/Paris")).toBe(false);
  });
});

describe("minutesLeft", () => {
  it("is proportional to the steps left, at least one minute", () => {
    expect(minutesLeft(24, 1, 6)).toBe(24);
    expect(minutesLeft(24, 4, 6)).toBe(12);
    expect(minutesLeft(24, 6, 6)).toBe(4);
    expect(minutesLeft(1, 6, 6)).toBe(1);
  });
});

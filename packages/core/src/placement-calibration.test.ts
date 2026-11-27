import { describe, expect, it } from "vitest";
import { cefrLevels } from "@dailylingua/schemas";
import {
  assessmentGap, calibratePlacementItems, placementCoverage, placementObservations, projectSkillRange,
  type PlacementCalibrationBank, type PlacementType,
} from "./placement-calibration";

const TYPES: Record<PlacementType, number> = { grammar: 4, vocabulary: 3, reading: 3 };
const items = cefrLevels.flatMap((level) =>
  Object.entries(TYPES).flatMap(([skill, count]) =>
    Array.from({ length: count }, (_, index) => ({
      id: `xx-${level.toLowerCase()}-${skill}-${index}`, level, skill: skill as PlacementType, answer: 1,
    })),
  ),
);
const bank: PlacementCalibrationBank = { version: "2026-11-27", items };

describe("placementCoverage", () => {
  it("counts questions per level and type and measures reading only", () => {
    const { cells, skills } = placementCoverage(items);
    expect(cells).toHaveLength(18);
    expect(cells.find((cell) => cell.level === "B1" && cell.type === "grammar")?.items).toBe(4);
    expect(skills).toEqual([
      { skill: "reading", measured: true },
      { skill: "listening", measured: false },
      { skill: "writing", measured: false },
      { skill: "speaking", measured: false },
    ]);
  });

  it("does not measure reading with fewer than two questions at one level", () => {
    const thin = items.filter((item) => !(item.level === "C1" && item.skill === "reading" && item.id.endsWith("1")
      || item.level === "C1" && item.skill === "reading" && item.id.endsWith("2")));
    expect(placementCoverage(thin).skills[0]).toEqual({ skill: "reading", measured: false });
    const two = items.filter((item) => !(item.level === "C1" && item.skill === "reading" && item.id.endsWith("2")));
    expect(placementCoverage(two).skills[0]).toEqual({ skill: "reading", measured: true });
  });
});

function observe(itemId: string, count: number, accounts: number, correct = true) {
  return Array.from({ length: count }, (_, index) => ({ account: `a${index % accounts}`, itemId, correct }));
}

describe("calibratePlacementItems", () => {
  const [first] = items;
  const one = [first!];

  it("needs 30 observations", () => {
    expect(calibratePlacementItems(one, observe(first!.id, 29, 29)).items[0]?.calibrated).toBe(false);
    expect(calibratePlacementItems(one, observe(first!.id, 30, 30)).items[0]?.calibrated).toBe(true);
  });

  it("needs 10 accounts", () => {
    expect(calibratePlacementItems(one, observe(first!.id, 30, 9)).items[0]?.calibrated).toBe(false);
    expect(calibratePlacementItems(one, observe(first!.id, 30, 10)).items[0]?.calibrated).toBe(true);
  });

  it("gives the share of right answers and a Wilson interval", () => {
    const observations = [...observe(first!.id, 20, 20, true), ...observe(first!.id, 10, 10, false)];
    const [item] = calibratePlacementItems(one, observations).items;
    expect(item?.pCorrect).toBeCloseTo(2 / 3);
    const [low, high] = item?.wilson95 ?? [0, 0];
    expect(low).toBeCloseTo(0.488, 2);
    expect(high).toBeCloseTo(0.808, 2);
  });

  it("has no interval without observation", () => {
    expect(calibratePlacementItems(one, []).items[0]).toMatchObject({ n: 0, pCorrect: null, wilson95: null });
  });

  it("activates a type only when all six levels are calibrated", () => {
    const grammar = items.filter((item) => item.skill === "grammar");
    const all = grammar.flatMap((item) => observe(item.id, 30, 30));
    const full = calibratePlacementItems(items, all);
    expect(full.adaptive).toEqual({ grammar: true, vocabulary: false, reading: false });
    expect(full.status).toBe("calibrage insuffisant");
    const withoutC2 = all.filter((observation) => !observation.itemId.includes("-c2-"));
    expect(calibratePlacementItems(items, withoutC2).adaptive.grammar).toBe(false);
    const everything = items.flatMap((item) => observe(item.id, 30, 30));
    expect(calibratePlacementItems(items, everything).status).toBe("calibré");
  });
});

const id = (n: number) => items[n]!.id;
function row(user: string, takenAt: string, payload: unknown, kind = "placement") {
  return { user_id: user, language: "xx", kind, taken_at: takenAt, payload };
}
const completed = (version: string, answers: { itemId: string; choice: number | null }[]) =>
  ({ status: "completed", bank_version: version, answers });

describe("placementObservations", () => {
  it("replays answers, counts 'I don't know' as wrong and ignores unknown items and repeats", () => {
    const result = placementObservations(bank, [
      row("u1", "2026-11-01T10:00:00Z", completed(bank.version, [
        { itemId: id(0), choice: 1 }, { itemId: id(1), choice: null }, { itemId: id(2), choice: 0 },
        { itemId: "xx-zz-9", choice: 1 }, { itemId: id(0), choice: 0 },
      ])),
    ]);
    expect(result.observations).toEqual([
      { account: "u1", itemId: id(0), correct: true },
      { account: "u1", itemId: id(1), correct: false },
      { account: "u1", itemId: id(2), correct: false },
    ]);
    expect(result).toMatchObject({ testsUsed: 1, testsIgnored: 0 });
  });

  it("ignores older bank versions, other kinds, skipped tests and malformed payloads", () => {
    const answers = [{ itemId: id(0), choice: 1 }];
    const result = placementObservations(bank, [
      row("u1", "2026-11-01T10:00:00Z", completed("2026-10-01", answers)),
      row("u2", "2026-11-01T10:00:00Z", { status: "skipped", bank_version: null }),
      row("u3", "2026-11-01T10:00:00Z", { oops: true }),
      row("u4", "2026-11-01T10:00:00Z", completed(bank.version, answers), "assessment"),
      row("u5", "2026-11-01T10:00:00Z", completed(bank.version, answers)),
    ]);
    expect(result.observations).toHaveLength(1);
    expect(result).toMatchObject({ testsUsed: 1, testsIgnored: 3 });
  });

  it("keeps only the oldest test of an account", () => {
    const result = placementObservations(bank, [
      row("u1", "2026-11-05T10:00:00Z", completed(bank.version, [{ itemId: id(0), choice: 1 }])),
      row("u1", "2026-11-01T10:00:00Z", completed(bank.version, [{ itemId: id(0), choice: 2 }])),
    ]);
    expect(result.observations).toEqual([{ account: "u1", itemId: id(0), correct: false }]);
    expect(result.testsUsed).toBe(1);
  });
});

describe("assessmentGap", () => {
  it("accepts a half level and refuses more", () => {
    expect(assessmentGap(4.5, 4)).toEqual({ gap: 0.5, withinHalfLevel: true });
    expect(assessmentGap(3, 4).withinHalfLevel).toBe(false);
  });
});

describe("projectSkillRange", () => {
  const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString();

  it("needs three measures", () => {
    const two = [{ at: day(0), value: 2 }, { at: day(90), value: 3 }];
    expect(projectSkillRange(two, { horizonDays: 30 })).toBeNull();
    expect(projectSkillRange([...two, { at: day(45), value: 2.5 }], { horizonDays: 30 })).not.toBeNull();
  });

  it("needs a span of 60 days", () => {
    const measures = (span: number) => [{ at: day(0), value: 2 }, { at: day(span / 2), value: 2.5 }, { at: day(span), value: 3 }];
    expect(projectSkillRange(measures(59), { horizonDays: 30 })).toBeNull();
    expect(projectSkillRange(measures(60), { horizonDays: 30 })).not.toBeNull();
  });

  it("extends the trend with at least half a level each side", () => {
    const range = projectSkillRange(
      [{ at: day(0), value: 2 }, { at: day(30), value: 2.5 }, { at: day(60), value: 3 }],
      { horizonDays: 60 },
    );
    expect(range?.centre).toBeCloseTo(4);
    expect(range?.low).toBeCloseTo(3.5);
    expect(range?.high).toBeCloseTo(4.5);
  });

  it("widens by the largest residual", () => {
    const range = projectSkillRange(
      [{ at: day(0), value: 2 }, { at: day(30), value: 4 }, { at: day(60), value: 2 }],
      { horizonDays: 0 },
    );
    expect(range?.centre).toBeCloseTo(2.667, 2);
    expect((range?.high ?? 0) - (range?.low ?? 0)).toBeCloseTo(2 * (4 - 2.667), 2);
  });

  it("clamps to the 0–7 scale", () => {
    const rising = [{ at: day(0), value: 5 }, { at: day(30), value: 6 }, { at: day(60), value: 7 }];
    expect(projectSkillRange(rising, { horizonDays: 365 })).toMatchObject({ high: 7, centre: 7 });
    const falling = [{ at: day(0), value: 2 }, { at: day(30), value: 1 }, { at: day(60), value: 0 }];
    expect(projectSkillRange(falling, { horizonDays: 365 })).toMatchObject({ low: 0, centre: 0 });
  });
});

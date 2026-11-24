import { isAssessmentUnit, type ResolvedAssessmentSource, type Unit, type UnitDraw, type UnitStatus } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { checkUnit, type CheckOptions, type UnitViolation } from "./check";
import { FIXTURE_AUDIO, FIXTURE_BILAN_ID, fixtureBilan, fixtureSituations, fixtureUnitId } from "./units/__fixtures__";
import { buildRegistry } from "./units/registry";

const REVIEW = { reviewedOn: "2026-11-20", passes: 2, arbiter: "arbitre-relecture" };
const reviewOf = (status: UnitStatus | undefined) => (status && status !== "draft" ? REVIEW : null);

/** The fixture registry (five situation units and the bilan), with the status of each. */
function setup(statuses: { situations?: UnitStatus; bilan?: UnitStatus } = {}) {
  const situations = fixtureSituations().map((unit) => ({ ...unit, status: statuses.situations ?? "draft", aiReview: reviewOf(statuses.situations) }));
  const bilan = { ...fixtureBilan(), status: statuses.bilan ?? "draft", aiReview: reviewOf(statuses.bilan) };
  const registry = buildRegistry([...situations, bilan]);
  const resolved = registry[FIXTURE_BILAN_ID];
  if (!resolved || !isAssessmentUnit(resolved)) throw new Error("no bilan");
  const options: CheckOptions = { grammarIds: [], audioExists: (path) => path === FIXTURE_AUDIO, units: registry };
  return { registry, resolved, options };
}

const codesOf = (unit: ResolvedAssessmentSource, options: CheckOptions): UnitViolation["code"][] => checkUnit(unit, options).map((violation) => violation.code);

/** A copy of the registry where one unit is changed. */
const withUnit = (registry: Readonly<Record<string, Unit>>, id: string, change: (unit: Unit) => Unit) => {
  const unit = registry[id];
  if (!unit) throw new Error(`no unit ${id}`);
  return { ...registry, [id]: change(unit) };
};

describe("checkUnit on a bilan", () => {
  it("finds nothing in a valid bilan", () => {
    const { resolved, options } = setup();
    expect(checkUnit(resolved, options)).toEqual([]);
  });

  it("flags a draw that is not in the test of its unit", () => {
    const { resolved, options } = setup();
    const units = withUnit(options.units ?? {}, fixtureUnitId("06"), (unit) => ({ ...unit, test: { ...unit.test, itemIds: unit.test.itemIds.map((id) => (id === "i1" ? "i11" : id)) } }));
    expect(codesOf(resolved, { ...options, units })).toEqual(["draw_not_in_test"]);
  });

  it("flags the same draw twice", () => {
    const { resolved, options } = setup();
    const [first, , ...rest] = resolved.draws as [UnitDraw, UnitDraw, ...UnitDraw[]];
    expect(codesOf({ ...resolved, draws: [first, first, ...rest] }, options)).toContain("draw_duplicate");
  });

  it("flags a draw from an unknown unit, another language, a later order or a writing unit", () => {
    const { resolved, options } = setup();
    const ghost = { ...resolved, draws: [{ unit: "it-a1-12-ghost", item: "i1" }, ...resolved.draws.slice(1)] };
    expect(codesOf(ghost, options)).toContain("draw_source");
    expect(codesOf(resolved, { ...options, units: undefined })).toContain("draw_source");

    const russian = withUnit(options.units ?? {}, fixtureUnitId("06"), (unit) => ({ ...unit, language: "ru" }));
    expect(codesOf(resolved, { ...options, units: russian })).toEqual(["draw_source", "draw_source"]);

    const later = withUnit(options.units ?? {}, fixtureUnitId("06"), (unit) => ({ ...unit, order: 11 }));
    expect(codesOf(resolved, { ...options, units: later })).toEqual(["draw_source", "draw_source"]);

    const script = withUnit(options.units ?? {}, fixtureUnitId("06"), (unit) => ({ ...unit, kind: "script" }) as unknown as Unit);
    expect(codesOf(resolved, { ...options, units: script })).toEqual(["draw_source", "draw_source"]);
  });

  it("flags a bilan that leaves a unit from 6 to 10 uncovered", () => {
    const { resolved, options } = setup();
    const others = resolved.draws.filter((draw) => draw.unit !== fixtureUnitId("09"));
    const draws = [...others, ...others.slice(0, 10 - others.length)];
    const violations = checkUnit({ ...resolved, draws }, options).filter((violation) => violation.code === "draw_coverage");
    expect(violations.map((violation) => violation.message)).toEqual([expect.stringContaining("unit 09")]);
  });

  it("requires the sources to be at least as advanced as the bilan", () => {
    const published = setup({ situations: "reviewed", bilan: "published" });
    expect(codesOf(published.resolved, published.options)).toContain("draw_status");
    const reviewed = setup({ situations: "draft", bilan: "reviewed" });
    expect(codesOf(reviewed.resolved, reviewed.options)).toContain("draw_status");
    const ok = setup({ situations: "published", bilan: "published" });
    expect(checkUnit(ok.resolved, ok.options)).toEqual([]);
    const reviewedOk = setup({ situations: "published", bilan: "reviewed" });
    expect(checkUnit(reviewedOk.resolved, reviewedOk.options)).toEqual([]);
  });

  it("applies the common rules (id, test size, pass score, one lesson) and not test_item_unseen", () => {
    const { resolved, options } = setup();
    expect(codesOf({ ...resolved, id: "ru-a1-11-bilan" }, options)).toEqual(["bad_id"]);
    expect(codesOf({ ...resolved, test: { ...resolved.test, itemIds: resolved.test.itemIds.slice(1) } }, options)).toEqual(["orphan_item", "test_size"]);
    expect(codesOf({ ...resolved, test: { ...resolved.test, passScore: 7 as never } }, options)).toEqual(["pass_score"]);
    const [lesson] = resolved.lessons;
    if (!lesson) throw new Error("no lesson");
    expect(codesOf({ ...resolved, lessons: [lesson, { ...lesson, id: "l2" }] }, options)).toEqual(["lesson_ids"]);
    expect(codesOf({ ...resolved, test: { ...resolved.test, itemIds: [...resolved.test.itemIds.slice(0, 9), "ghost"] } }, options)).toContain("unknown_item");
  });
});

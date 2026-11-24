import { isAssessmentUnit, type AssessmentUnitSource } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { FIXTURE_BILAN_ID, fixtureBilan, fixtureSituations, fixtureUnitId } from "./__fixtures__";
import { buildRegistry } from "./registry";

function bilanOf(sources: readonly unknown[]) {
  const unit = buildRegistry(sources)[FIXTURE_BILAN_ID];
  if (!unit || !isAssessmentUnit(unit)) throw new Error("the bilan is not resolved");
  return unit;
}

describe("buildRegistry: the bilan", () => {
  it("resolves the draws into items with rewritten ids, drawnFrom, one lesson with the test step and the test", () => {
    const bilan = bilanOf([...fixtureSituations(), fixtureBilan()]);
    expect(bilan.items.map((item) => item.id)).toEqual(["06-i1", "08-i3", "10-i5", "07-i2", "09-i4", "08-i6", "06-i7", "10-i8", "09-i9", "07-i10"]);
    expect(bilan.test).toEqual({ itemIds: bilan.items.map((item) => item.id), passScore: 8 });
    expect(bilan.drawnFrom).toMatchObject({ "06-i1": fixtureUnitId("06"), "08-i3": fixtureUnitId("08"), "07-i10": fixtureUnitId("07") });
    expect(Object.keys(bilan.drawnFrom)).toHaveLength(10);
    expect(bilan.lessons).toEqual([{ id: "l1", steps: [{ step: "test", itemIds: [], threshold: 0.8 }] }]);
    expect(bilan.version).toMatch(/^[0-9a-f]{12}$/);
    // The items are copies of the drawn ones, only their id differs.
    const original = fixtureSituations()[0]?.items.find((item) => item.id === "i1");
    expect(bilan.items[0]).toEqual({ ...original, id: "06-i1" });
  });

  it("does not depend on the order of the sources (the bilan is resolved last)", () => {
    expect(bilanOf([fixtureBilan(), ...fixtureSituations()])).toEqual(bilanOf([...fixtureSituations(), fixtureBilan()]));
  });

  it("changes the version when a drawn item changes, and when the source changes", () => {
    const before = bilanOf([...fixtureSituations(), fixtureBilan()]).version;
    const edited = fixtureSituations().map((unit) =>
      unit.id === fixtureUnitId("06") ? { ...unit, items: unit.items.map((item) => (item.id === "i1" && item.kind === "mcq" ? { ...item, prompt: "Ciao!" } : item)) } : unit,
    );
    expect(bilanOf([...edited, fixtureBilan()]).version).not.toBe(before);
    // An item of the source unit that is not drawn does not matter.
    const untouched = fixtureSituations().map((unit) =>
      unit.id === fixtureUnitId("06") ? { ...unit, items: unit.items.map((item) => (item.id === "i9" && item.kind === "cloze" ? { ...item, after: "Marco!" } : item)) } : unit,
    );
    expect(bilanOf([...untouched, fixtureBilan()]).version).toBe(before);
    expect(bilanOf([...fixtureSituations(), { ...fixtureBilan(), minutes: 12 }]).version).not.toBe(before);
  });

  it("refuses a draw from an unknown unit or an unknown item, and names the bilan", () => {
    const bilan = fixtureBilan();
    const draws = (first: AssessmentUnitSource["draws"][number]) => ({ ...bilan, draws: [first, ...bilan.draws.slice(1)] });
    expect(() => buildRegistry([...fixtureSituations(), draws({ unit: "it-a1-12-ghost", item: "i1" })])).toThrow(/it-a1-11-bilan.*unknown unit/);
    expect(() => buildRegistry([...fixtureSituations(), draws({ unit: fixtureUnitId("06"), item: "ghost" })])).toThrow(/it-a1-11-bilan.*no item ghost/);
    expect(() => buildRegistry([fixtureBilan()])).toThrow(/unknown unit/);
  });

  it("refuses a bilan that draws from another bilan, and a bilan with other than 10 draws", () => {
    const other = { ...fixtureBilan(), id: "it-a1-12-bilan", order: 12 };
    const chained = { ...fixtureBilan(), draws: [{ unit: other.id, item: "06-i1" }, ...fixtureBilan().draws.slice(1)] };
    expect(() => buildRegistry([...fixtureSituations(), other, chained])).toThrow(/unknown unit/);
    expect(() => buildRegistry([...fixtureSituations(), { ...fixtureBilan(), draws: fixtureBilan().draws.slice(1) }])).toThrow(/Invalid unit it-a1-11-bilan/);
  });

  it("refuses a duplicated bilan id, and a reviewed bilan without an AI review", () => {
    expect(() => buildRegistry([...fixtureSituations(), fixtureBilan(), fixtureBilan()])).toThrow(/Duplicate unit id/);
    expect(() => buildRegistry([...fixtureSituations(), { ...fixtureBilan(), status: "reviewed" }])).toThrow(/aiReview/);
  });
});

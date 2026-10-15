import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/schemas/common";
import type { PlacementItem } from "@/lib/schemas/placement";
import {
  nextPlacementStep,
  pickPlacementItem,
  placementVariantFor,
  replayPlacement,
  type PlacementResponse,
} from "./placement";

const r = (level: CefrLevel, ...outcomes: boolean[]): PlacementResponse[] =>
  outcomes.map((correct) => ({ level, correct }));

/** 3 questions per level, option 0 is always the right one. */
const items: PlacementItem[] = CEFR_LEVELS.flatMap((level) =>
  [1, 2, 3].map((n) => ({
    id: `xx-e-${level.toLowerCase()}-${n}`,
    level,
    skill: "grammar" as const,
    prompt: "___",
    options: ["a", "b", "c", "d"] as [string, string, string, string],
    answer: 0,
  })),
);
const answer = (level: string, n: number, choice: number | null) => ({
  itemId: `xx-e-${level}-${n}`,
  choice,
});

describe("nextPlacementStep", () => {
  it("asks at the starting level first", () => {
    expect(nextPlacementStep("B1", [])).toEqual({ kind: "ask", level: "B1" });
    expect(nextPlacementStep("B1", r("B1", true))).toEqual({ kind: "ask", level: "B1" });
  });

  it("climbs while levels pass and ends at C2 when everything is right", () => {
    const all = [...r("B1", true, true), ...r("B2", true, true), ...r("C1", true, true), ...r("C2", true, true)];
    expect(nextPlacementStep("B1", all.slice(0, 2))).toEqual({ kind: "ask", level: "B2" });
    expect(nextPlacementStep("B1", all)).toEqual({ kind: "done", estimate: "C2", confidence: "high" });
  });

  it("goes down while levels fail and ends at A1 when everything is wrong", () => {
    const all = [...r("B1", false, false), ...r("A2", false, false), ...r("A1", false, false)];
    expect(nextPlacementStep("B1", all.slice(0, 2))).toEqual({ kind: "ask", level: "A2" });
    expect(nextPlacementStep("B1", all)).toEqual({ kind: "done", estimate: "A1", confidence: "high" });
  });

  it("stops on a clean boundary: B1 passed, B2 failed", () => {
    expect(nextPlacementStep("B1", [...r("B1", true, true), ...r("B2", false, false)])).toEqual({
      kind: "done",
      estimate: "B1",
      confidence: "high",
    });
  });

  it("stops on a boundary reached from above: B2 failed, then B1 passed", () => {
    expect(nextPlacementStep("B2", [...r("B2", false, false), ...r("B1", true, true)])).toEqual({
      kind: "done",
      estimate: "B1",
      confidence: "high",
    });
  });

  it("asks a third question when a level is split, and 2 out of 3 passes it", () => {
    expect(nextPlacementStep("B1", r("B1", true, false))).toEqual({ kind: "ask", level: "B1" });
    expect(nextPlacementStep("B1", r("B1", true, false, true))).toEqual({ kind: "ask", level: "B2" });
    expect(nextPlacementStep("B1", r("B1", false, true, false))).toEqual({ kind: "ask", level: "A2" });
  });

  it("is of medium confidence when one boundary level was split", () => {
    const responses = [...r("B1", true, false, true), ...r("B2", false, false)];
    expect(nextPlacementStep("B1", responses)).toEqual({ kind: "done", estimate: "B1", confidence: "medium" });
  });

  it("is of low confidence when both boundary levels were split", () => {
    const responses = [...r("B1", true, false, true), ...r("B2", true, false, false)];
    expect(nextPlacementStep("B1", responses)).toEqual({ kind: "done", estimate: "B1", confidence: "low" });
  });

  it("throws on a response at a level the test did not ask for", () => {
    expect(() => nextPlacementStep("B1", r("B2", true))).toThrow();
    expect(() => nextPlacementStep("B1", [...r("B1", true, true), ...r("B1", true)])).toThrow();
  });

  it("throws when responses continue after the end", () => {
    expect(() => nextPlacementStep("A1", [...r("A1", false, false), ...r("A1", true)])).toThrow();
  });
});

describe("pickPlacementItem", () => {
  it("takes the first question of the level in bank order that was not asked yet", () => {
    expect(pickPlacementItem(items, "B1", new Set())?.id).toBe("xx-e-b1-1");
    expect(pickPlacementItem(items, "B1", new Set(["xx-e-b1-1"]))?.id).toBe("xx-e-b1-2");
    expect(pickPlacementItem(items, "B1", new Set(["xx-e-b1-1", "xx-e-b1-2", "xx-e-b1-3"]))).toBeNull();
  });
});

describe("replayPlacement", () => {
  const finished = [answer("b1", 1, 0), answer("b1", 2, 0), answer("b2", 1, 1), answer("b2", 2, null)];

  it("replays a finished test", () => {
    expect(replayPlacement(items, "B1", finished)).toEqual({ ok: true, estimate: "B1", confidence: "high" });
  });

  it("counts a wrong choice and an unknown (null) answer as wrong", () => {
    const outcome = replayPlacement(items, "B1", [answer("b1", 1, 3), answer("b1", 2, null), ...finished.slice(2)]);
    expect(outcome).toMatchObject({ ok: false });
    expect(replayPlacement(items, "B1", [answer("b1", 1, 3), answer("b1", 2, null), answer("a2", 1, 0), answer("a2", 2, 0)])).toEqual({
      ok: true,
      estimate: "A2",
      confidence: "high",
    });
  });

  it("refuses an item the engine would not have asked", () => {
    expect(replayPlacement(items, "B1", [answer("b2", 1, 0), ...finished.slice(1)])).toMatchObject({ ok: false });
    expect(replayPlacement(items, "B1", [answer("b1", 2, 0), ...finished.slice(1)])).toMatchObject({ ok: false });
    expect(replayPlacement(items, "B1", [answer("zz", 1, 0)])).toMatchObject({ ok: false });
  });

  it("refuses an unfinished test", () => {
    expect(replayPlacement(items, "B1", finished.slice(0, 3))).toEqual({
      ok: false,
      reason: "the test is not finished",
    });
  });

  it("refuses extra answers after the end", () => {
    expect(replayPlacement(items, "B1", [...finished, answer("a2", 1, 0)])).toEqual({
      ok: false,
      reason: "answers after the end of the test",
    });
  });
});

describe("placementVariantFor", () => {
  it("suggests the professional variant for a professional purpose, the everyday one otherwise", () => {
    expect(placementVariantFor("professional")).toBe("professional");
    for (const purpose of ["general", "conversational", "travel", "exam"] as const) {
      expect(placementVariantFor(purpose)).toBe("everyday");
    }
  });
});

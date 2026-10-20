import { describe, expect, it } from "vitest";
import { buildFlatItems } from "@/lib/placement/testing";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/schemas/common";
import { PLACEMENT_MAX_ITEMS } from "@/lib/schemas/placement";
import {
  nextPlacementStep,
  pickPlacementItem,
  replayPlacement,
  shufflePlacementItems,
  type PlacementResponse,
} from "./placement";

/** A block of 5 responses at `level`, the first `right` of them right. */
const block = (level: CefrLevel, right: number): PlacementResponse[] =>
  Array.from({ length: 5 }, (_, i) => ({ level, correct: i < right }));

const items = buildFlatItems();
/** The 5 questions the engine asks at `level` with the bank in its own order. */
function blockItems(level: CefrLevel, bank = items) {
  const asked = new Set<string>();
  return Array.from({ length: 5 }, () => {
    const item = pickPlacementItem(bank, level, asked)!;
    asked.add(item.id);
    return item;
  });
}
/** Answers to the block of `level`, the first `right` of them right. */
function answersFor(level: CefrLevel, right: number, bank = items) {
  return blockItems(level, bank).map((item, i) => ({ itemId: item.id, choice: i < right ? item.answer : null }));
}

describe("nextPlacementStep", () => {
  it("asks at the starting level and keeps asking until the block of 5 is complete", () => {
    expect(nextPlacementStep("B1", [])).toEqual({ kind: "ask", level: "B1" });
    expect(nextPlacementStep("B1", block("B1", 5).slice(0, 4))).toEqual({ kind: "ask", level: "B1" });
  });

  it("passes a block from 3 right answers out of 5 and climbs", () => {
    expect(nextPlacementStep("B1", block("B1", 3))).toEqual({ kind: "ask", level: "B2" });
    expect(nextPlacementStep("B1", block("B1", 5))).toEqual({ kind: "ask", level: "B2" });
  });

  it("fails a block with 2 right answers and goes down", () => {
    expect(nextPlacementStep("B1", block("B1", 2))).toEqual({ kind: "ask", level: "A2" });
    expect(nextPlacementStep("B1", block("B1", 0))).toEqual({ kind: "ask", level: "A2" });
  });

  it("ends at C2 when everything is right, after 4 blocks from B1", () => {
    const all = [...block("B1", 5), ...block("B2", 5), ...block("C1", 5), ...block("C2", 5)];
    expect(nextPlacementStep("B1", all.slice(0, 15))).toEqual({ kind: "ask", level: "C2" });
    expect(nextPlacementStep("B1", all)).toEqual({ kind: "done", estimate: "C2", confidence: "high" });
  });

  it("ends at A1 when everything is wrong", () => {
    const all = [...block("B1", 0), ...block("A2", 0), ...block("A1", 0)];
    expect(nextPlacementStep("B1", all)).toEqual({ kind: "done", estimate: "A1", confidence: "high" });
  });

  it("stops on the boundary: B1 passed, B2 failed", () => {
    expect(nextPlacementStep("B1", [...block("B1", 4), ...block("B2", 1)])).toEqual({
      kind: "done",
      estimate: "B1",
      confidence: "high",
    });
  });

  it("stops on a boundary reached from above: B2 failed, then B1 passed", () => {
    expect(nextPlacementStep("B2", [...block("B2", 0), ...block("B1", 5)])).toEqual({
      kind: "done",
      estimate: "B1",
      confidence: "high",
    });
  });

  it("never asks more than 30 questions, from any starting level", () => {
    for (const start of CEFR_LEVELS) {
      for (const right of [0, 5]) {
        let responses: PlacementResponse[] = [];
        for (;;) {
          const step = nextPlacementStep(start, responses);
          if (step.kind === "done") break;
          responses = [...responses, { level: step.level, correct: responses.length % 5 < right }];
        }
        expect(responses.length).toBeLessThanOrEqual(PLACEMENT_MAX_ITEMS);
      }
    }
    // A1 start, every block passed with 3/5: 6 blocks, 30 questions, a single borderline boundary block.
    const climb = CEFR_LEVELS.flatMap((level) => block(level, 3));
    expect(climb).toHaveLength(PLACEMENT_MAX_ITEMS);
    expect(nextPlacementStep("A1", climb)).toEqual({ kind: "done", estimate: "C2", confidence: "medium" });
  });

  describe("confidence", () => {
    it("is high when both boundary blocks are clear (0, 1, 4 or 5 right)", () => {
      expect(nextPlacementStep("B1", [...block("B1", 4), ...block("B2", 1)])).toMatchObject({ confidence: "high" });
      expect(nextPlacementStep("B1", [...block("B1", 5), ...block("B2", 0)])).toMatchObject({ confidence: "high" });
    });

    it("is medium when one boundary block is borderline", () => {
      expect(nextPlacementStep("B1", [...block("B1", 3), ...block("B2", 1)])).toEqual({
        kind: "done",
        estimate: "B1",
        confidence: "medium",
      });
      expect(nextPlacementStep("B1", [...block("B1", 5), ...block("B2", 2)])).toMatchObject({ confidence: "medium" });
    });

    it("is low when both boundary blocks are borderline", () => {
      expect(nextPlacementStep("B1", [...block("B1", 3), ...block("B2", 2)])).toEqual({
        kind: "done",
        estimate: "B1",
        confidence: "low",
      });
    });

    it("only looks at the boundary blocks", () => {
      // B1 3/5 (borderline) passes, B2 5/5 passes, C1 0/5 fails: the boundary is B2/C1.
      const responses = [...block("B1", 3), ...block("B2", 5), ...block("C1", 0)];
      expect(nextPlacementStep("B1", responses)).toEqual({ kind: "done", estimate: "B2", confidence: "high" });
    });
  });

  it("throws on a response at a level the test did not ask for", () => {
    expect(() => nextPlacementStep("B1", block("B2", 5))).toThrow();
    expect(() => nextPlacementStep("B1", [...block("B1", 5), ...block("B1", 1)])).toThrow();
  });

  it("throws when responses continue after the end", () => {
    expect(() => nextPlacementStep("A1", [...block("A1", 0), { level: "A1", correct: true }])).toThrow();
  });
});

describe("pickPlacementItem", () => {
  it("alternates the skills within a block: grammar, vocabulary, reading, grammar, vocabulary", () => {
    expect(blockItems("B1").map((i) => i.skill)).toEqual(["grammar", "vocabulary", "reading", "grammar", "vocabulary"]);
    expect(blockItems("B1").map((i) => i.id)).toEqual(["xx-b1-1", "xx-b1-5", "xx-b1-8", "xx-b1-2", "xx-b1-6"]);
  });

  it("follows the given order within a skill and skips a skill with no question left", () => {
    const b1 = items.filter((i) => i.level === "B1");
    const reversed = [...b1].reverse();
    expect(pickPlacementItem(reversed, "B1", new Set())?.id).toBe("xx-b1-4");
    const noGrammarLeft = new Set(b1.filter((i) => i.skill === "grammar").map((i) => i.id));
    expect(pickPlacementItem(items, "B1", noGrammarLeft)?.skill).toBe("vocabulary");
    expect(pickPlacementItem(items, "B1", new Set(b1.map((i) => i.id)))).toBeNull();
  });
});

describe("shufflePlacementItems", () => {
  it("returns the same questions in another order, without touching the bank", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const shuffled = shufflePlacementItems(items, random);
    expect(shuffled).not.toBe(items);
    expect(shuffled.map((i) => i.id)).not.toEqual(items.map((i) => i.id));
    expect([...shuffled].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...items].sort((a, b) => a.id.localeCompare(b.id)));
    expect(items[0].id).toBe("xx-a1-1");
  });
});

describe("replayPlacement", () => {
  // B1 passed 4/5, B2 failed 1/5.
  const finished = [...answersFor("B1", 4), ...answersFor("B2", 1)];

  it("replays a finished test", () => {
    expect(replayPlacement(items, "B1", finished)).toEqual({ ok: true, estimate: "B1", confidence: "high" });
  });

  it("counts an unknown (null) answer and a wrong choice as wrong", () => {
    const wrong = blockItems("B1").map((i, index) => ({ itemId: i.id, choice: index % 2 === 0 ? (i.answer + 1) % 4 : null }));
    expect(replayPlacement(items, "B1", [...wrong, ...answersFor("A2", 5)])).toEqual({
      ok: true,
      estimate: "A2",
      confidence: "high",
    });
  });

  it("accepts a test drawn in another order, as the client shuffles the bank", () => {
    const shuffled = [...items].reverse();
    const answers = [...answersFor("B1", 4, shuffled), ...answersFor("B2", 1, shuffled)];
    expect(answers[0].itemId).toBe("xx-b1-4");
    expect(replayPlacement(items, "B1", answers)).toEqual({ ok: true, estimate: "B1", confidence: "high" });
  });

  it("refuses an item the engine would not have asked", () => {
    const rest = finished.slice(1);
    // Wrong level.
    expect(replayPlacement(items, "B1", [{ itemId: "xx-b2-1", choice: 0 }, ...rest])).toMatchObject({ ok: false });
    // Right level, wrong skill: the block starts with grammar.
    expect(replayPlacement(items, "B1", [{ itemId: "xx-b1-5", choice: 0 }, ...rest])).toMatchObject({ ok: false });
    // The same question twice.
    expect(replayPlacement(items, "B1", [finished[0], finished[0], ...finished.slice(2)])).toMatchObject({ ok: false });
    expect(replayPlacement(items, "B1", [{ itemId: "zz", choice: 0 }])).toMatchObject({ ok: false });
  });

  it("refuses answers whose order does not follow the engine", () => {
    // B2 questions first although the test starts at B1.
    expect(replayPlacement(items, "B1", [...answersFor("B2", 1), ...answersFor("B1", 4)])).toMatchObject({ ok: false });
    // Two questions of a block swapped: vocabulary before grammar.
    const swapped = [finished[1], finished[0], ...finished.slice(2)];
    expect(replayPlacement(items, "B1", swapped)).toMatchObject({ ok: false });
  });

  it("refuses an unfinished test", () => {
    expect(replayPlacement(items, "B1", finished.slice(0, 7))).toEqual({
      ok: false,
      reason: "the test is not finished",
    });
  });

  it("refuses extra answers after the end", () => {
    expect(replayPlacement(items, "B1", [...finished, ...answersFor("A2", 5)])).toEqual({
      ok: false,
      reason: "answers after the end of the test",
    });
  });
});

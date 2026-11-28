import { describe, expect, it } from "vitest";
import { confidenceBars, railLevels, stepSegments, testStartLevel } from "./progress";

const block = (level: "A1" | "A2" | "B1" | "B2", right: number) => Array.from({ length: 5 }, (_, i) => ({ level, correct: i < right }));

describe("stepSegments", () => {
  it("marks the blocks of five questions done, the current one and the rest", () => {
    expect(stepSegments(0)).toEqual(["current", "todo", "todo", "todo", "todo", "todo"]);
    expect(stepSegments(4)).toEqual(["current", "todo", "todo", "todo", "todo", "todo"]);
    expect(stepSegments(12)).toEqual(["done", "done", "current", "todo", "todo", "todo"]);
    expect(stepSegments(25)).toEqual(["done", "done", "done", "done", "done", "current"]);
  });
});

describe("railLevels", () => {
  it("shows the levels up to the next one: passed ones mastered, the asked one current", () => {
    expect(railLevels([...block("A1", 4), ...block("A2", 3)], "B1")).toEqual([
      { level: "A1", state: "mastered" },
      { level: "A2", state: "mastered" },
      { level: "B1", state: "current" },
      { level: "B2", state: "idle" },
    ]);
  });

  it("does not master a failed level and shows a start above A1 with the levels below it", () => {
    expect(railLevels(block("B1", 2), "A2")).toEqual([
      { level: "A1", state: "idle" },
      { level: "A2", state: "current" },
      { level: "B1", state: "idle" },
      { level: "B2", state: "idle" },
    ]);
    expect(railLevels([], "B1").map(({ level }) => level)).toEqual(["A1", "A2", "B1", "B2"]);
  });

  it("stops at C2", () => {
    expect(railLevels([], "C2")).toHaveLength(6);
  });
});

describe("confidenceBars and testStartLevel", () => {
  it("fills one, two or three bars", () => {
    expect([confidenceBars("low"), confidenceBars("medium"), confidenceBars("high")]).toEqual([1, 2, 3]);
  });

  it("starts a declared A0, or no declaration, at A1", () => {
    expect([testStartLevel("A0"), testStartLevel(null), testStartLevel("B2")]).toEqual(["A1", "A1", "B2"]);
  });
});

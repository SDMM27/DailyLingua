import { cefrLevels } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { levelToValue, targetLevel, valueToLevel, wantedLevels } from "./levels";

describe("targetLevel", () => {
  it("is one below, the same or one above, bounded", () => {
    expect(targetLevel("B1", "comfortable")).toBe("A2");
    expect(targetLevel("B1", "matched")).toBe("B1");
    expect(targetLevel("B1", "challenge")).toBe("B2");
    expect(targetLevel("A1", "comfortable")).toBe("A1");
    expect(targetLevel("C2", "challenge")).toBe("C2");
  });
});

describe("wantedLevels", () => {
  it("returns the target level and its two neighbours", () => {
    expect(wantedLevels("B1", "matched")).toEqual(["A2", "B1", "B2"]);
    expect(wantedLevels("B1", "challenge")).toEqual(["B1", "B2", "C1"]);
    expect(wantedLevels("B1", "comfortable")).toEqual(["A1", "A2", "B1"]);
  });

  it("stops at A1 and C2", () => {
    expect(wantedLevels("A1", "matched")).toEqual(["A1", "A2"]);
    expect(wantedLevels("C2", "challenge")).toEqual(["C1", "C2"]);
  });
});

describe("levelToValue", () => {
  it("is A1 1.5, A2 2.5 … C2 5.5, always inside 0..6", () => {
    expect(cefrLevels.map(levelToValue)).toEqual([1.5, 2.5, 3.5, 4.5, 5.25, 5.5]);
  });
});

describe("valueToLevel", () => {
  it("maps 0 to 1 to A0", () => {
    expect(valueToLevel(0)).toBe("A0");
    expect(valueToLevel(0.99)).toBe("A0");
  });

  it("maps each band to its level, lower bound included", () => {
    expect(valueToLevel(1)).toBe("A1");
    expect(valueToLevel(1.99)).toBe("A1");
    expect(valueToLevel(2)).toBe("A2");
    expect(valueToLevel(3.5)).toBe("B1");
    expect(valueToLevel(4.99)).toBe("B2");
    expect(valueToLevel(5)).toBe("C1");
    expect(valueToLevel(5.49)).toBe("C1");
    expect(valueToLevel(5.5)).toBe("C2");
  });

  it("clamps outside the scale", () => {
    expect(valueToLevel(-3)).toBe("A0");
    expect(valueToLevel(6)).toBe("C2");
    expect(valueToLevel(9)).toBe("C2");
    expect(valueToLevel(Number.NaN)).toBe("A0");
  });

  it("round-trips every level", () => {
    for (const level of cefrLevels) expect(valueToLevel(levelToValue(level))).toBe(level);
  });
});

import { describe, expect, it } from "vitest";
import { targetLevel, wantedLevels } from "./levels";

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

import { describe, expect, it } from "vitest";
import type { CefrLevel } from "@/lib/schemas/common";
import { LEARNING_PATHS, pathInvites, pathStage, type PathModule, type PathStage } from "./learning-path";

const MODULES: PathModule[] = ["alphabet", "grammar", "vocabulary", "errors"];
const STAGES = Object.keys(LEARNING_PATHS) as PathStage[];

describe("pathStage", () => {
  it.each<[CefrLevel, PathStage]>([
    ["A1", "basics"],
    ["A2", "basics"],
    ["B1", "core"],
    ["B2", "core"],
    ["C1", "advanced"],
    ["C2", "advanced"],
  ])("maps %s to %s when the script is not being learned", (level, stage) => {
    expect(pathStage(level, { learningScript: false })).toBe(stage);
  });

  it("makes an A1 learner of an unfinished script a beginner", () => {
    expect(pathStage("A1", { learningScript: true })).toBe("beginner");
    expect(pathStage("A1", { learningScript: false })).toBe("basics");
  });

  it("ignores learningScript from A2 up", () => {
    for (const level of ["A2", "B1", "B2", "C1", "C2"] as const) {
      expect(pathStage(level, { learningScript: true })).toBe(pathStage(level, { learningScript: false }));
    }
  });
});

describe("LEARNING_PATHS", () => {
  it.each(STAGES)("lists each module exactly once at the %s stage", (stage) => {
    expect([...LEARNING_PATHS[stage].modules].sort()).toEqual([...MODULES].sort());
  });

  it.each(STAGES)("only invites to modules it lists at the %s stage", (stage) => {
    const { modules, invites } = LEARNING_PATHS[stage];
    for (const invited of invites) expect(modules).toContain(invited);
  });
});

describe("pathInvites", () => {
  it("invites to the alphabet only at the beginner stage", () => {
    expect(STAGES.filter((s) => pathInvites(s, "alphabet"))).toEqual(["beginner"]);
  });

  it("invites to grammar at beginner, basics and core but not advanced", () => {
    expect(pathInvites("beginner", "grammar")).toBe(true);
    expect(pathInvites("basics", "grammar")).toBe(true);
    expect(pathInvites("core", "grammar")).toBe(true);
    expect(pathInvites("advanced", "grammar")).toBe(false);
  });
});

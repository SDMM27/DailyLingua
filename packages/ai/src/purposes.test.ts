import { describe, expect, it } from "vitest";
import { AI_PURPOSES, AI_PURPOSE_NAMES, isAiPurpose, type PurposeSpec } from "./purposes";

describe("purpose registry", () => {
  it("has the seven purposes of the design", () => {
    expect([...AI_PURPOSE_NAMES].sort()).toEqual(
      ["assessment_grading", "gloss", "graded_text", "rewrite_check", "roleplay", "translation", "writing_feedback"].sort(),
    );
  });

  it("gives a quota kind and a limit together, or neither", () => {
    for (const [name, spec] of Object.entries<PurposeSpec>(AI_PURPOSES)) {
      expect(spec.quotaKind === null, name).toBe(spec.dailyLimit === null);
      if (spec.quotaKind !== null) {
        // The SQL function accepts 1 to 40 characters in [a-z_].
        expect(spec.quotaKind, name).toMatch(/^[a-z_]{1,40}$/);
        expect(spec.dailyLimit, name).toBeGreaterThan(0);
      }
      expect(spec.maxOutputTokens, name).toBeGreaterThan(0);
    }
  });

  it("applies the daily quotas of docs/refonte/g-budget.md", () => {
    expect(AI_PURPOSES.writing_feedback.dailyLimit).toBe(3);
    expect(AI_PURPOSES.roleplay.dailyLimit).toBe(1);
    expect(AI_PURPOSES.graded_text.dailyLimit).toBe(2);
  });

  it("stops role play, on-demand texts and stock generation first, never the session", () => {
    for (const name of ["roleplay", "graded_text", "gloss", "translation"] as const) {
      expect(AI_PURPOSES[name].essential, name).toBe(false);
    }
    for (const name of ["writing_feedback", "rewrite_check", "assessment_grading"] as const) {
      expect(AI_PURPOSES[name].essential, name).toBe(true);
    }
  });

  it("recognises purposes by name only", () => {
    expect(isAiPurpose("roleplay")).toBe(true);
    expect(isAiPurpose("toString")).toBe(false);
  });
});

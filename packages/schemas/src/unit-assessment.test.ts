import { describe, expect, it } from "vitest";
import { isAssessmentUnit, isScriptUnit, unitSchema } from "./index";

const l10n = (text: string) => ({ fr: `${text} fr`, en: `${text} en` });

function validBilan() {
  return {
    id: "it-a1-11-bilan",
    language: "it",
    kind: "assessment" as const,
    level: "A1" as const,
    order: 11,
    title: l10n("Bilan"),
    situation: l10n("Situation"),
    minutes: 10,
    canDo: [{ id: "c1", text: l10n("one") }, { id: "c2", text: l10n("two") }],
    draws: Array.from({ length: 10 }, (_, i) => ({ unit: `it-a1-${String(6 + (i % 5)).padStart(2, "0")}-fixture`, item: `i${i + 1}` })),
    aiReview: null,
  };
}

describe("bilan (kind assessment)", () => {
  it("accepts a bilan source, defaults the status to draft and narrows with isAssessmentUnit", () => {
    const parsed = unitSchema.safeParse(validBilan());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe("draft");
    expect(isAssessmentUnit(parsed.data)).toBe(true);
    expect(isScriptUnit(parsed.data)).toBe(false);
  });

  it("needs exactly 10 draws, level A1 and 2 or 3 can-do", () => {
    expect(unitSchema.safeParse({ ...validBilan(), draws: validBilan().draws.slice(1) }).success).toBe(false);
    expect(unitSchema.safeParse({ ...validBilan(), draws: [...validBilan().draws, { unit: "it-a1-06-x1", item: "i1" }] }).success).toBe(false);
    expect(unitSchema.safeParse({ ...validBilan(), level: "A0" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...validBilan(), canDo: [] }).success).toBe(false);
  });

  it("refuses a malformed draw, the fields of a resolved bilan, and a reviewed bilan without AI review", () => {
    expect(unitSchema.safeParse({ ...validBilan(), draws: [{ unit: "nope", item: "i1" }, ...validBilan().draws.slice(1)] }).success).toBe(false);
    expect(unitSchema.safeParse({ ...validBilan(), test: { itemIds: [], passScore: 8 } }).success).toBe(false);
    expect(unitSchema.safeParse({ ...validBilan(), status: "reviewed" }).success).toBe(false);
    const review = { reviewedOn: "2026-11-20", passes: 2, arbiter: "arbitre" };
    expect(unitSchema.safeParse({ ...validBilan(), status: "published", aiReview: review }).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import type { AssessmentDossier } from "@/lib/schemas/assessment";
import { FIXTURE_DOSSIER } from "@/test/assessment-fixtures";
import { isDossierVisible, readAssessmentDraftPolicy, visibleDossiers } from "./policy";

const AUDIO = { file: "/assessment/it/it-a1-1.m4a", speaker: "Giulia", licence: "granted-commercial", recordedOn: "2026-11-01" } as const;
const draft: AssessmentDossier = { ...FIXTURE_DOSSIER, reviewedOn: null, audio: null };

describe("readAssessmentDraftPolicy", () => {
  it("shows drafts by default, except in production", () => {
    expect(readAssessmentDraftPolicy({})).toBe("show");
    expect(readAssessmentDraftPolicy({ VERCEL_ENV: "preview" })).toBe("show");
    expect(readAssessmentDraftPolicy({ VERCEL_ENV: "production" })).toBe("hide");
  });

  it("lets ASSESSMENT_DRAFTS decide", () => {
    expect(readAssessmentDraftPolicy({ ASSESSMENT_DRAFTS: "show", VERCEL_ENV: "production" })).toBe("show");
    expect(readAssessmentDraftPolicy({ ASSESSMENT_DRAFTS: " hide " })).toBe("hide");
  });

  it("fails on an unknown value", () => {
    expect(() => readAssessmentDraftPolicy({ ASSESSMENT_DRAFTS: "yes" })).toThrow(/ASSESSMENT_DRAFTS/);
  });
});

describe("isDossierVisible", () => {
  it("shows everything under the show policy", () => {
    expect(isDossierVisible(draft, "show")).toBe(true);
  });

  it("needs both a review and a recording under the hide policy", () => {
    expect(isDossierVisible(draft, "hide")).toBe(false);
    expect(isDossierVisible({ ...draft, reviewedOn: "2026-11-01" }, "hide")).toBe(false);
    expect(isDossierVisible({ ...draft, audio: AUDIO }, "hide")).toBe(false);
    expect(isDossierVisible({ ...draft, reviewedOn: "2026-11-01", audio: AUDIO }, "hide")).toBe(true);
  });
});

describe("visibleDossiers", () => {
  it("is empty for a language without dossiers", () => {
    expect(visibleDossiers("ja", "A1", "show")).toEqual([]);
  });

  it("lists the pilot dossiers of a level under the show policy only", () => {
    expect(visibleDossiers("ru", "B1", "show").map((d) => d.id)).toEqual(["ru-b1-1"]);
    expect(visibleDossiers("ru", "B1", "hide")).toEqual([]);
  });
});

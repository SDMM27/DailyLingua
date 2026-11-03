import { describe, expect, it } from "vitest";
import type { AssessmentDossier } from "@/lib/schemas/assessment";
import { FIXTURE_DOSSIER, FIXTURE_YOUTUBE_DOSSIER } from "@/test/assessment-fixtures";
import { isDossierVisible, listeningMode, readAssessmentDraftPolicy, visibleDossiers } from "./policy";

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

describe("isDossierVisible, YouTube listening", () => {
  const video = FIXTURE_YOUTUBE_DOSSIER.listening.source === "youtube" ? FIXTURE_YOUTUBE_DOSSIER.listening.video : null!;
  const youtube = (reviewedOn: string | null, checkedOn: string | null, audio: AssessmentDossier["audio"] = null): AssessmentDossier => ({
    ...FIXTURE_YOUTUBE_DOSSIER,
    reviewedOn,
    audio,
    listening: { ...FIXTURE_YOUTUBE_DOSSIER.listening, video: { ...video, checkedOn } } as AssessmentDossier["listening"],
  });

  it("needs both a review and a listened-to passage under the hide policy, no recording", () => {
    expect(isDossierVisible(youtube(null, null), "hide")).toBe(false);
    expect(isDossierVisible(youtube("2026-11-01", null), "hide")).toBe(false);
    expect(isDossierVisible(youtube(null, "2026-11-02"), "hide")).toBe(false);
    expect(isDossierVisible(youtube("2026-11-01", "2026-11-02"), "hide")).toBe(true);
  });

  it("shows everything under the show policy", () => {
    expect(isDossierVisible(youtube(null, null), "show")).toBe(true);
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

describe("listeningMode", () => {
  it("plays a YouTube passage whatever the policy", () => {
    expect(listeningMode(FIXTURE_YOUTUBE_DOSSIER, "hide")).toBe("youtube");
    expect(listeningMode(FIXTURE_YOUTUBE_DOSSIER, "show")).toBe("youtube");
  });

  it("plays the recording whenever there is one", () => {
    expect(listeningMode({ ...draft, audio: AUDIO }, "hide")).toBe("audio");
    expect(listeningMode({ ...draft, audio: AUDIO }, "show")).toBe("audio");
  });

  it("shows the script of an unrecorded dossier only under the show policy", () => {
    expect(listeningMode(draft, "show")).toBe("draft-script");
    expect(listeningMode(draft, "hide")).toBe("unavailable");
  });
});

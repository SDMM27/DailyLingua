import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import type { Assessment, AssessmentDossier, AssessmentGradedSkillResult, AssessmentResults } from "@/lib/schemas/assessment";
import type { CefrLevel } from "@/lib/schemas/common";
import type { Preferences } from "@/lib/schemas/preferences";
import { applyAssessmentLevel, saveAssessmentAnswers, startAssessment } from "./assessment";

// Under the "hide" policy only a dossier that is reviewed and recorded is visible.
vi.mock("@/lib/assessment/dossiers", async () => {
  const { FIXTURE_DOSSIER } = await import("@/test/assessment-fixtures");
  const audio = { file: "/assessment/it/x.m4a", speaker: "Test", licence: "granted-commercial", recordedOn: "2026-11-01" } as const;
  const make = (n: string, level: AssessmentDossier["level"], published: boolean): AssessmentDossier => ({
    ...FIXTURE_DOSSIER,
    id: `it-${level.toLowerCase()}-${n}`,
    level,
    audio: published ? audio : null,
    reviewedOn: published ? "2026-11-01" : null,
  });
  return {
    ASSESSMENT_DOSSIERS: {
      it: [make("1", "B1", true), make("2", "B1", true), make("3", "B1", false), make("1", "B2", true), make("1", "C1", false)],
    },
  };
});

const repo = vi.hoisted(() => ({
  isDemo: false,
  getPreferences: vi.fn<() => Promise<Preferences | null>>(),
  listAssessments: vi.fn<(language?: string) => Promise<Assessment[]>>(),
  startAssessment: vi.fn<(language: string, dossierId: string) => Promise<string>>(),
  saveAssessmentAnswers: vi.fn<(id: string, answers: unknown, plays: number) => Promise<void>>(),
  applyAssessmentLevel: vi.fn<(id: string, level: string) => Promise<void>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

const graded = (
  id: string,
  dossierId: string,
  results: Partial<AssessmentResults> = {},
  language: Assessment["language"] = "it",
): Assessment => ({
  id,
  language,
  dossierId,
  status: "graded",
  answers: { questions: {}, writing: "", speaking: {} },
  listeningPlays: 0,
  results: { reading: null, listening: null, writing: null, speaking: null, review: { questions: {}, writing: null }, ...results },
  startedAt: "2026-11-01T10:00:00Z",
  gradedAt: "2026-11-01T10:20:00Z",
});
const skill = (level: CefrLevel, offerHigher = false): AssessmentGradedSkillResult => ({ level, confidence: "high", offerHigher });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("ASSESSMENT_DRAFTS", "hide");
  repo.isDemo = false;
  repo.getPreferences.mockResolvedValue(MOCK_PREFERENCES); // it: B1
  repo.listAssessments.mockResolvedValue([]);
  repo.startAssessment.mockResolvedValue("assessment-1");
  repo.saveAssessmentAnswers.mockResolvedValue();
  repo.applyAssessmentLevel.mockResolvedValue();
});

describe("startAssessment", () => {
  it("picks the first visible dossier of the learner’s level", async () => {
    expect(await startAssessment({ language: "it" })).toEqual({ ok: true, data: { assessmentId: "assessment-1" } });
    expect(repo.startAssessment).toHaveBeenCalledWith("it", "it-b1-1");
  });

  it("takes the next dossier the learner has not graded yet, and never a hidden draft", async () => {
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b1-1")]);
    await startAssessment({ language: "it" });
    expect(repo.startAssessment).toHaveBeenLastCalledWith("it", "it-b1-2");
  });

  it("starts over with the first dossier once all of them were graded", async () => {
    repo.listAssessments.mockResolvedValue([graded("a2", "it-b1-2"), graded("a1", "it-b1-1")]);
    await startAssessment({ language: "it" });
    expect(repo.startAssessment).toHaveBeenLastCalledWith("it", "it-b1-1");
  });

  it("ignores a dossier or a level named by the browser", async () => {
    await startAssessment({ language: "it", dossierId: "it-b1-3", level: "C1" });
    expect(repo.startAssessment).toHaveBeenLastCalledWith("it", "it-b1-1");
  });

  it("refuses the level above when no graded assessment asks for it", async () => {
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b1-1", { reading: skill("B1", false) })]);
    expect(await startAssessment({ language: "it", higher: true })).toMatchObject({ ok: false });
    expect(repo.startAssessment).not.toHaveBeenCalled();
  });

  it("refuses the level above for a learner with no graded assessment", async () => {
    expect(await startAssessment({ language: "it", higher: true })).toMatchObject({ ok: false });
    expect(repo.startAssessment).not.toHaveBeenCalled();
  });

  it("gives a dossier of the level above when the latest graded assessment offers it", async () => {
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b1-1", { reading: skill("B1", true) })]);
    await startAssessment({ language: "it", higher: true });
    expect(repo.startAssessment).toHaveBeenCalledWith("it", "it-b2-1");
  });

  it("does not offer the level above when no dossier is visible there", async () => {
    // C1 only has a draft, hidden under the hide policy.
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b2-1", { reading: skill("B2", true) })]);
    expect(await startAssessment({ language: "it", higher: true })).toMatchObject({ ok: false });
    expect(repo.startAssessment).not.toHaveBeenCalled();
  });

  it("starts no assessment when no dossier is visible at the learner’s level", async () => {
    repo.getPreferences.mockResolvedValue({
      ...MOCK_PREFERENCES,
      goals: MOCK_PREFERENCES.goals.map((g) => (g.language === "it" ? { ...g, level: "C1" as const } : g)),
    });
    expect(await startAssessment({ language: "it" })).toEqual({ ok: false, error: "Le bilan n’est pas encore disponible à ce niveau." });
    expect(repo.startAssessment).not.toHaveBeenCalled();
  });

  it("starts no assessment for a language without dossier, one the learner does not study, or an unknown one", async () => {
    expect(await startAssessment({ language: "ru" })).toMatchObject({ ok: false });
    expect(await startAssessment({ language: "ja" })).toMatchObject({ ok: false });
    expect(await startAssessment({ language: "xx" })).toMatchObject({ ok: false });
    expect(repo.startAssessment).not.toHaveBeenCalled();
  });

  it("shows the drafts under the show policy", async () => {
    vi.stubEnv("ASSESSMENT_DRAFTS", "show");
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b1-1"), graded("a2", "it-b1-2")]);
    await startAssessment({ language: "it" });
    expect(repo.startAssessment).toHaveBeenLastCalledWith("it", "it-b1-3");
  });

  it("is refused in the demo", async () => {
    repo.isDemo = true;
    expect(await startAssessment({ language: "it" })).toMatchObject({ ok: false });
    expect(repo.startAssessment).not.toHaveBeenCalled();
  });
});

describe("saveAssessmentAnswers", () => {
  const answers = { questions: { "it-b1-1-r1": "Torino" }, writing: "", speaking: { s1: true } };

  it("saves the answers and the plays", async () => {
    expect(await saveAssessmentAnswers({ assessmentId: "a1", answers, listeningPlays: 2 })).toEqual({ ok: true, data: undefined });
    expect(repo.saveAssessmentAnswers).toHaveBeenCalledWith("a1", answers, 2);
  });

  it("refuses a fourth listening and too long an answer before the repository", async () => {
    expect(await saveAssessmentAnswers({ assessmentId: "a1", answers, listeningPlays: 4 })).toMatchObject({ ok: false });
    const long = { ...answers, questions: { q: "x".repeat(1501) } };
    expect(await saveAssessmentAnswers({ assessmentId: "a1", answers: long, listeningPlays: 0 })).toMatchObject({ ok: false });
    expect(repo.saveAssessmentAnswers).not.toHaveBeenCalled();
  });
});

describe("applyAssessmentLevel", () => {
  const results = { reading: skill("B2"), listening: skill("B1"), writing: skill("C1") };

  it("applies the reception level computed from the stored results, the lowest of reading and listening", async () => {
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b2-1", results)]);
    expect(await applyAssessmentLevel({ assessmentId: "a1" })).toEqual({ ok: true, data: { level: "B1" } });
    expect(repo.applyAssessmentLevel).toHaveBeenCalledWith("a1", "B1");
  });

  it("ignores a level sent by the browser", async () => {
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b2-1", results)]);
    await applyAssessmentLevel({ assessmentId: "a1", level: "C2" });
    expect(repo.applyAssessmentLevel).toHaveBeenCalledWith("a1", "B1");
  });

  it("refuses an assessment that is not graded, or not the user’s", async () => {
    repo.listAssessments.mockResolvedValue([{ ...graded("a1", "it-b2-1", results), status: "in_progress", results: null }]);
    expect(await applyAssessmentLevel({ assessmentId: "a1" })).toMatchObject({ ok: false });
    expect(await applyAssessmentLevel({ assessmentId: "someone-elses" })).toMatchObject({ ok: false });
    expect(repo.applyAssessmentLevel).not.toHaveBeenCalled();
  });

  it("refuses an assessment when a more recent one of the language exists", async () => {
    repo.listAssessments.mockResolvedValue([graded("new", "it-b1-2", results), graded("old", "it-b1-1", results)]);
    expect(await applyAssessmentLevel({ assessmentId: "old" })).toMatchObject({ ok: false });
    expect(repo.applyAssessmentLevel).not.toHaveBeenCalled();
    expect(await applyAssessmentLevel({ assessmentId: "new" })).toMatchObject({ ok: true });
  });

  it("accepts the latest of its own language even when another language has a newer one", async () => {
    repo.listAssessments.mockResolvedValue([graded("ru-new", "ru-b1-1", results, "ru"), graded("it-1", "it-b1-1", results)]);
    expect(await applyAssessmentLevel({ assessmentId: "it-1" })).toMatchObject({ ok: true });
  });

  it("changes nothing when only the writing was assessed", async () => {
    repo.listAssessments.mockResolvedValue([graded("a1", "it-b1-1", { writing: skill("B1") })]);
    expect(await applyAssessmentLevel({ assessmentId: "a1" })).toMatchObject({ ok: false });
    expect(repo.applyAssessmentLevel).not.toHaveBeenCalled();
  });

  it("is refused in the demo", async () => {
    repo.isDemo = true;
    expect(await applyAssessmentLevel({ assessmentId: "a1" })).toMatchObject({ ok: false });
  });
});

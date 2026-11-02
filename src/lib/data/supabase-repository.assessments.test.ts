import { describe, expect, it, vi } from "vitest";
import { UserFacingError } from "./errors";

vi.mock("server-only", () => ({}));

const { createSupabaseRepository } = await import("./supabase-repository");

const repoFailingWith = (code: string) =>
  createSupabaseRepository({ rpc: vi.fn(async () => ({ data: null, error: { code, message: code } })) } as never, "user-1");

describe("assessment errors", () => {
  it("tells a guest to create an account", async () => {
    const error = await repoFailingWith("DL004").startAssessment("ru", "ru-b2-1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as Error).message).toBe("Le bilan complet demande un compte. Crée le tien pour le faire.");
  });

  it("maps a missing language, an invalid dossier and a closed assessment to user messages", async () => {
    await expect(repoFailingWith("P0002").startAssessment("ru", "ru-b2-1")).rejects.toBeInstanceOf(UserFacingError);
    await expect(repoFailingWith("22023").startAssessment("ru", "it-b1-1")).rejects.toBeInstanceOf(UserFacingError);
    const answers = { questions: {}, writing: "", speaking: {} };
    await expect(repoFailingWith("P0002").saveAssessmentAnswers("id", answers, 1)).rejects.toBeInstanceOf(UserFacingError);
    await expect(repoFailingWith("22023").saveAssessmentAnswers("id", answers, 9)).rejects.toBeInstanceOf(UserFacingError);
  });

  it("maps the errors of applying a level to user messages", async () => {
    await expect(repoFailingWith("P0002").applyAssessmentLevel("id", "B1")).rejects.toBeInstanceOf(UserFacingError);
    await expect(repoFailingWith("22023").applyAssessmentLevel("id", "B1")).rejects.toBeInstanceOf(UserFacingError);
    await expect(repoFailingWith("XX000").applyAssessmentLevel("id", "B1")).rejects.not.toBeInstanceOf(UserFacingError);
  });

  it("calls the function with the assessment and the level", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    await createSupabaseRepository({ rpc } as never, "user-1").applyAssessmentLevel("id-1", "B2");
    expect(rpc).toHaveBeenCalledWith("apply_assessment_reception_level", { p_assessment_id: "id-1", p_level: "B2" });
  });

  it("lets other errors through as technical ones", async () => {
    const error = await repoFailingWith("XX000").startAssessment("ru", "ru-b2-1").catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(UserFacingError);
  });
});

describe("assessment grading", () => {
  const client = {} as never;

  it("reports the attempts left as unknown when grading is off", async () => {
    const repo = createSupabaseRepository(client, "user-1");
    expect(await repo.gradeAssessment("a1")).toEqual({ status: "unavailable", attemptsLeft: null });
  });

  it("reports them as unknown after an unexpected error, and keeps the error out of the result", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const gradeAssessment = vi.fn(async () => {
      throw new Error("boom");
    });
    const repo = createSupabaseRepository(client, "user-1", { gradeAssessment });
    expect(await repo.gradeAssessment("a1")).toEqual({ status: "unavailable", attemptsLeft: null });
  });

  it("passes the outcome of the grader through, with the known attempts left", async () => {
    const gradeAssessment = vi.fn(async () => ({ status: "unavailable" as const, attemptsLeft: 0 }));
    const repo = createSupabaseRepository(client, "user-1", { gradeAssessment });
    expect(await repo.gradeAssessment("a1")).toEqual({ status: "unavailable", attemptsLeft: 0 });
    expect(gradeAssessment).toHaveBeenCalledWith({ userId: "user-1", assessmentId: "a1" });
  });
});

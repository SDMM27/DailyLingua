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

  it("lets other errors through as technical ones", async () => {
    const error = await repoFailingWith("XX000").startAssessment("ru", "ru-b2-1").catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(UserFacingError);
  });
});

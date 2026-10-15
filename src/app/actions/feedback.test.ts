import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/data/errors";
import type { FeedbackInput } from "@/lib/schemas/feedback";
import { sendFeedback } from "./feedback";

const repo = vi.hoisted(() => ({
  isDemo: false,
  sendFeedback: vi.fn<(input: FeedbackInput) => Promise<void>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

beforeEach(() => {
  vi.clearAllMocks();
  repo.isDemo = false;
  repo.sendFeedback.mockResolvedValue();
});

describe("sendFeedback", () => {
  it("sends the validated feedback", async () => {
    expect(await sendFeedback({ category: "idee", message: "  Une idée  ", page: "/lire" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(repo.sendFeedback).toHaveBeenCalledWith({ category: "idee", message: "Une idée", page: "/lire" });
  });

  it("refuses invalid input whatever the client sends", async () => {
    expect((await sendFeedback({ category: "bug", message: "a" })).ok).toBe(false);
    expect((await sendFeedback({ category: "inconnue", message: "Bonjour" })).ok).toBe(false);
    expect((await sendFeedback(null)).ok).toBe(false);
    expect(repo.sendFeedback).not.toHaveBeenCalled();
  });

  it("returns the message of the rate limit", async () => {
    repo.sendFeedback.mockRejectedValue(
      new UserFacingError("Tu as envoyé beaucoup de retours aujourd’hui, réessaie demain."),
    );
    expect(await sendFeedback({ category: "bug", message: "Encore un" })).toEqual({
      ok: false,
      error: "Tu as envoyé beaucoup de retours aujourd’hui, réessaie demain.",
    });
  });

  it("hides unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    repo.sendFeedback.mockRejectedValue(new Error("Supabase (retour) : secret"));
    expect(await sendFeedback({ category: "bug", message: "Bonjour" })).toEqual({
      ok: false,
      error: "Une erreur est survenue. Réessaie dans un instant.",
    });
  });

  it("is refused in the demo", async () => {
    repo.isDemo = true;
    const result = await sendFeedback({ category: "bug", message: "Bonjour" });
    expect(result).toEqual({ ok: false, error: "Mode démonstration : rien n’est enregistré." });
    expect(repo.sendFeedback).not.toHaveBeenCalled();
  });
});

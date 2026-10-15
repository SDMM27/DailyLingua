import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/data/errors";
import type { ReplaceContentResult } from "@/lib/data/repository";
import { reportNoAccess } from "./mission";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ refresh }));

const repo = vi.hoisted(() => ({
  isDemo: false,
  replaceInaccessibleContent: vi.fn<(sessionId: string) => Promise<ReplaceContentResult>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

const SESSION = "6f1c2f0e-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  repo.isDemo = false;
  repo.replaceInaccessibleContent.mockResolvedValue({ status: "ready" });
});

describe("reportNoAccess", () => {
  it("replaces the content and refreshes the page", async () => {
    expect(await reportNoAccess({ sessionId: SESSION })).toEqual({ ok: true, data: { status: "ready" } });
    expect(repo.replaceInaccessibleContent).toHaveBeenCalledWith(SESSION);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when nothing was replaced", async () => {
    repo.replaceInaccessibleContent.mockResolvedValue({ status: "limit" });
    expect(await reportNoAccess({ sessionId: SESSION })).toEqual({ ok: true, data: { status: "limit" } });
    repo.replaceInaccessibleContent.mockResolvedValue({ status: "no-content" });
    await reportNoAccess({ sessionId: SESSION });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses invalid input and the demo", async () => {
    expect((await reportNoAccess({})).ok).toBe(false);
    expect((await reportNoAccess({ sessionId: "" })).ok).toBe(false);
    repo.isDemo = true;
    expect((await reportNoAccess({ sessionId: SESSION })).ok).toBe(false);
    expect(repo.replaceInaccessibleContent).not.toHaveBeenCalled();
  });

  it("returns the message meant for the user, and hides other errors", async () => {
    repo.replaceInaccessibleContent.mockRejectedValueOnce(new UserFacingError("Cette session est introuvable."));
    expect(await reportNoAccess({ sessionId: SESSION })).toEqual({ ok: false, error: "Cette session est introuvable." });
    repo.replaceInaccessibleContent.mockRejectedValueOnce(new Error("secret"));
    expect(await reportNoAccess({ sessionId: SESSION })).toEqual({
      ok: false,
      error: "Une erreur est survenue. Réessaie dans un instant.",
    });
  });
});

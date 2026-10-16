import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/data/errors";
import { setSourceAccess } from "./preferences";

const repo = vi.hoisted(() => ({
  isDemo: false,
  setSourceAccess: vi.fn<(sourceId: string, hasAccess: boolean) => Promise<void>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

const SOURCE_ID = "6f1c2b6e-0d8a-4c53-9a0e-3f4f8a1b2c3d";

beforeEach(() => {
  vi.clearAllMocks();
  repo.isDemo = false;
  repo.setSourceAccess.mockResolvedValue();
});

describe("setSourceAccess", () => {
  it("declares and withdraws access", async () => {
    expect(await setSourceAccess({ sourceId: SOURCE_ID, hasAccess: true })).toEqual({ ok: true, data: undefined });
    expect(repo.setSourceAccess).toHaveBeenLastCalledWith(SOURCE_ID, true);
    await setSourceAccess({ sourceId: SOURCE_ID, hasAccess: false });
    expect(repo.setSourceAccess).toHaveBeenLastCalledWith(SOURCE_ID, false);
  });

  it("refuses input that is not a source id and a boolean", async () => {
    expect((await setSourceAccess({ sourceId: "nope", hasAccess: true })).ok).toBe(false);
    expect((await setSourceAccess({ sourceId: SOURCE_ID, hasAccess: "yes" })).ok).toBe(false);
    expect(repo.setSourceAccess).not.toHaveBeenCalled();
  });

  it("refuses in the demo", async () => {
    repo.isDemo = true;
    expect((await setSourceAccess({ sourceId: SOURCE_ID, hasAccess: true })).ok).toBe(false);
    expect(repo.setSourceAccess).not.toHaveBeenCalled();
  });

  it("passes on the message of a refused source", async () => {
    repo.setSourceAccess.mockRejectedValue(new UserFacingError("Cette source n’existe pas ou n’est pas payante."));
    expect(await setSourceAccess({ sourceId: SOURCE_ID, hasAccess: true })).toEqual({
      ok: false,
      error: "Cette source n’existe pas ou n’est pas payante.",
    });
  });
});

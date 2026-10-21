import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/data/errors";
import type { AlphabetPracticeResult } from "@/lib/domain/alphabet";
import type { RecordAlphabetPracticeInput } from "@/lib/schemas/alphabet";
import { recordAlphabetPractice } from "./alphabet";

const repo = vi.hoisted(() => ({
  isDemo: false,
  recordAlphabetPractice: vi.fn<(input: RecordAlphabetPracticeInput) => Promise<AlphabetPracticeResult>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const INPUT = { groupId: "ru-alphabet-1", correct: 9, total: 11, expectedReviewCount: null };

beforeEach(() => {
  vi.clearAllMocks();
  repo.isDemo = false;
  repo.recordAlphabetPractice.mockResolvedValue({ outcome: "not-passed", card: null });
});

describe("recordAlphabetPractice", () => {
  it("records the validated run and refreshes the pages", async () => {
    expect(await recordAlphabetPractice(INPUT)).toEqual({ ok: true, data: { outcome: "not-passed", card: null } });
    expect(repo.recordAlphabetPractice).toHaveBeenCalledWith(INPUT);
    expect(revalidatePath).toHaveBeenCalledWith("/alphabet");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("refuses invalid input whatever the client sends", async () => {
    expect((await recordAlphabetPractice({ ...INPUT, correct: 12 })).ok).toBe(false);
    expect((await recordAlphabetPractice({ ...INPUT, total: 21, correct: 3 })).ok).toBe(false);
    expect((await recordAlphabetPractice({ ...INPUT, groupId: "nope" })).ok).toBe(false);
    expect((await recordAlphabetPractice(null)).ok).toBe(false);
    expect(repo.recordAlphabetPractice).not.toHaveBeenCalled();
  });

  it("refuses the demo", async () => {
    repo.isDemo = true;
    expect(await recordAlphabetPractice(INPUT)).toEqual({ ok: false, error: "Mode démonstration : rien n’est enregistré." });
  });

  it("returns the message of a stale card without refreshing", async () => {
    repo.recordAlphabetPractice.mockRejectedValue(new UserFacingError("Cette fiche a changé entre-temps : recharge la page."));
    expect(await recordAlphabetPractice(INPUT)).toEqual({
      ok: false,
      error: "Cette fiche a changé entre-temps : recharge la page.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

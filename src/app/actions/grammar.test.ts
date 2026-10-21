import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/data/errors";
import type { GrammarPracticeResult } from "@/lib/domain/grammar";
import type { RecordGrammarPracticeInput } from "@/lib/schemas/grammar";
import { deleteGrammarCard, recordGrammarPractice } from "./grammar";

const repo = vi.hoisted(() => ({
  isDemo: false,
  recordGrammarPractice: vi.fn<(input: RecordGrammarPracticeInput) => Promise<GrammarPracticeResult>>(),
  deleteGrammarCard: vi.fn<(id: string) => Promise<void>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const INPUT = { pointId: "it-a1-present", correct: 3, total: 3, expectedReviewCount: null };

beforeEach(() => {
  vi.clearAllMocks();
  repo.isDemo = false;
  repo.recordGrammarPractice.mockResolvedValue({ outcome: "not-passed", card: null });
  repo.deleteGrammarCard.mockResolvedValue();
});

describe("recordGrammarPractice", () => {
  it("records the validated run and refreshes the pages", async () => {
    expect(await recordGrammarPractice(INPUT)).toEqual({ ok: true, data: { outcome: "not-passed", card: null } });
    expect(repo.recordGrammarPractice).toHaveBeenCalledWith(INPUT);
    expect(revalidatePath).toHaveBeenCalledWith("/grammaire");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("refuses invalid input whatever the client sends", async () => {
    expect((await recordGrammarPractice({ ...INPUT, correct: 4 })).ok).toBe(false);
    expect((await recordGrammarPractice({ ...INPUT, pointId: "nope" })).ok).toBe(false);
    expect((await recordGrammarPractice(null)).ok).toBe(false);
    expect(repo.recordGrammarPractice).not.toHaveBeenCalled();
  });

  it("refuses the demo", async () => {
    repo.isDemo = true;
    expect(await recordGrammarPractice(INPUT)).toEqual({ ok: false, error: "Mode démonstration : rien n’est enregistré." });
  });

  it("returns the message of a stale card without refreshing", async () => {
    repo.recordGrammarPractice.mockRejectedValue(new UserFacingError("Cette fiche a changé entre-temps : recharge la page."));
    expect(await recordGrammarPractice(INPUT)).toEqual({
      ok: false,
      error: "Cette fiche a changé entre-temps : recharge la page.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteGrammarCard", () => {
  it("deletes the card and refreshes the pages", async () => {
    expect(await deleteGrammarCard({ id: "g1" })).toEqual({ ok: true, data: undefined });
    expect(repo.deleteGrammarCard).toHaveBeenCalledWith("g1");
    expect(revalidatePath).toHaveBeenCalledWith("/grammaire");
  });
});

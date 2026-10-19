import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import type { PlacementBank, PlacementItem, PlacementRecord } from "@/lib/schemas/placement";
import type { Preferences } from "@/lib/schemas/preferences";
import { completePlacementTest, skipPlacementTest } from "./placement";

const fake = vi.hoisted(() => {
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  /** 10 questions per level; the right answer is always option 0. */
  const items: PlacementItem[] = LEVELS.flatMap((level) =>
    Array.from({ length: 10 }, (_, i) => ({
      id: `ru-${level.toLowerCase()}-${i + 1}`,
      level,
      skill: "grammar" as const,
      prompt: "Я ___ дома.",
      options: ["a", "b", "c", "d"] as [string, string, string, string],
      answer: 0,
    })),
  );
  return { language: "ru", version: "2026-10-19", items } satisfies PlacementBank;
});
vi.mock("@/lib/placement/banks", () => ({
  placementBank: () => fake,
  placementItems: () => fake.items,
}));

const repo = vi.hoisted(() => ({
  isDemo: false,
  getPreferences: vi.fn<() => Promise<Preferences | null>>(),
  recordPlacementTest: vi.fn<(r: PlacementRecord) => Promise<void>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

/** Answers to the first 5 questions of `level`, the first `right` of them right (option 0). */
const block = (level: string, right: number) =>
  [1, 2, 3, 4, 5].map((n) => ({ itemId: `ru-${level}-${n}`, choice: n <= right ? 0 : n % 2 ? 1 : null }));

// Started at B1: B1 passed 5/5, B2 failed 0/5 → B1, clear boundary, high confidence.
const answers = [...block("b1", 5), ...block("b2", 0)];
const input = { language: "ru", startLevel: "B1", answers, chosenLevel: "B2" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  repo.isDemo = false;
  repo.getPreferences.mockResolvedValue(MOCK_PREFERENCES);
  repo.recordPlacementTest.mockResolvedValue();
});

describe("completePlacementTest", () => {
  it("records the estimate computed by the server, with the correct flags and the bank version", async () => {
    expect(await completePlacementTest(input)).toEqual({
      ok: true,
      data: { estimate: "B1", confidence: "high" },
    });
    expect(repo.recordPlacementTest).toHaveBeenCalledWith({
      status: "completed",
      language: "ru",
      startLevel: "B1",
      estimatedLevel: "B1",
      confidence: "high",
      chosenLevel: "B2",
      answers: answers.map((a) => ({ ...a, correct: a.choice === 0 })),
      bankVersion: "2026-10-19",
    });
  });

  it("computes the estimate itself from the answers, with a lower confidence on borderline blocks", async () => {
    // B1 passed 3/5, B2 failed 2/5: B1, both blocks borderline.
    const borderline = [...block("b1", 3), ...block("b2", 2)];
    expect(await completePlacementTest({ ...input, answers: borderline, chosenLevel: "C2" })).toEqual({
      ok: true,
      data: { estimate: "B1", confidence: "low" },
    });
    // Everything wrong from B1 down to A1.
    const low = [...block("b1", 0), ...block("a2", 0), ...block("a1", 0)];
    expect(await completePlacementTest({ ...input, answers: low })).toEqual({
      ok: true,
      data: { estimate: "A1", confidence: "high" },
    });
  });

  it("does not take a variant into account", async () => {
    expect((await completePlacementTest({ ...input, variant: "professional" })).ok).toBe(true);
    expect(repo.recordPlacementTest.mock.calls[0][0]).not.toHaveProperty("variant");
  });

  it("refuses answers that do not follow the test", async () => {
    const result = await completePlacementTest({ ...input, answers: [{ itemId: "ru-c2-1", choice: 0 }] });
    expect(result).toEqual({ ok: false, error: "Le test n’a pas pu être vérifié. Recommence-le." });
    expect(repo.recordPlacementTest).not.toHaveBeenCalled();
  });

  it("refuses an unfinished test", async () => {
    const result = await completePlacementTest({ ...input, answers: answers.slice(0, 9) });
    expect(result.ok).toBe(false);
    expect(repo.recordPlacementTest).not.toHaveBeenCalled();
  });

  it("refuses a language the user does not study", async () => {
    repo.getPreferences.mockResolvedValue({ ...MOCK_PREFERENCES, goals: [MOCK_PREFERENCES.goals[1]] });
    expect(await completePlacementTest(input)).toEqual({
      ok: false,
      error: "Cette langue ne fait pas partie de tes langues.",
    });
    expect(repo.recordPlacementTest).not.toHaveBeenCalled();
  });

  it("refuses malformed input", async () => {
    expect((await completePlacementTest({ ...input, chosenLevel: "D1" })).ok).toBe(false);
    expect((await completePlacementTest({ ...input, answers: [] })).ok).toBe(false);
    expect(repo.recordPlacementTest).not.toHaveBeenCalled();
  });

  it("is refused in the demo", async () => {
    repo.isDemo = true;
    expect(await completePlacementTest(input)).toEqual({
      ok: false,
      error: "Mode démonstration : rien n’est enregistré.",
    });
  });
});

describe("skipPlacementTest", () => {
  it("records a skipped test", async () => {
    expect(await skipPlacementTest({ language: "it" })).toEqual({ ok: true, data: undefined });
    expect(repo.recordPlacementTest).toHaveBeenCalledWith({ status: "skipped", language: "it" });
  });

  it("refuses a language the user does not study", async () => {
    expect((await skipPlacementTest({ language: "ko" })).ok).toBe(false);
    expect(repo.recordPlacementTest).not.toHaveBeenCalled();
  });
});

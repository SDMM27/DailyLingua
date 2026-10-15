import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import type { PlacementBank, PlacementItem, PlacementRecord, PlacementVariant } from "@/lib/schemas/placement";
import type { Preferences } from "@/lib/schemas/preferences";
import { completePlacementTest, skipPlacementTest } from "./placement";

const fake = vi.hoisted(() => {
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  /** 3 questions per level and variant; the right answer is always option 0. */
  const items = (letter: "e" | "p"): PlacementItem[] =>
    LEVELS.flatMap((level) =>
      [1, 2, 3].map((n) => ({
        id: `ru-${letter}-${level.toLowerCase()}-${n}`,
        level,
        skill: "grammar" as const,
        prompt: "Я ___ дома.",
        options: ["a", "b", "c", "d"] as [string, string, string, string],
        answer: 0,
      })),
    );
  const bank: PlacementBank = {
    language: "ru",
    version: "2026-10-15",
    variants: { everyday: items("e"), professional: items("p") },
  };
  return bank;
});
vi.mock("@/lib/placement/banks", () => ({
  PLACEMENT_BANKS: { ru: fake },
  placementItems: (_language: "ru", variant: PlacementVariant) => fake.variants[variant],
}));

const repo = vi.hoisted(() => ({
  isDemo: false,
  getPreferences: vi.fn<() => Promise<Preferences | null>>(),
  recordPlacementTest: vi.fn<(r: PlacementRecord) => Promise<void>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

// Started at B1: B1 passed 2/2, B2 failed 0/2 → B1, clean boundary, high confidence.
const answers = [
  { itemId: "ru-e-b1-1", choice: 0 },
  { itemId: "ru-e-b1-2", choice: 0 },
  { itemId: "ru-e-b2-1", choice: 1 },
  { itemId: "ru-e-b2-2", choice: null },
];
const input = { language: "ru", variant: "everyday", startLevel: "B1", answers, chosenLevel: "B2" };

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
      variant: "everyday",
      startLevel: "B1",
      estimatedLevel: "B1",
      confidence: "high",
      chosenLevel: "B2",
      answers: [
        { itemId: "ru-e-b1-1", choice: 0, correct: true },
        { itemId: "ru-e-b1-2", choice: 0, correct: true },
        { itemId: "ru-e-b2-1", choice: 1, correct: false },
        { itemId: "ru-e-b2-2", choice: null, correct: false },
      ],
      bankVersion: "2026-10-15",
    });
  });

  it("refuses answers that do not follow the test", async () => {
    const result = await completePlacementTest({ ...input, answers: [{ itemId: "ru-e-c2-1", choice: 0 }] });
    expect(result).toEqual({ ok: false, error: "Le test n’a pas pu être vérifié. Recommence-le." });
    expect(repo.recordPlacementTest).not.toHaveBeenCalled();
  });

  it("refuses an unfinished test", async () => {
    const result = await completePlacementTest({ ...input, answers: answers.slice(0, 3) });
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

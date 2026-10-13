import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import type { Language } from "@/lib/schemas/common";
import type { Preferences } from "@/lib/schemas/preferences";
import { savePreferences } from "./preferences";

const repo = vi.hoisted(() => ({
  isDemo: false,
  listAvailableLanguages: vi.fn<() => Promise<Language[]>>(),
  getPreferences: vi.fn<() => Promise<Preferences | null>>(),
  savePreferences: vi.fn<(p: Preferences) => Promise<void>>(),
}));
vi.mock("@/lib/data/repository", () => ({ getRepository: async () => repo }));

const withGoals = (...languages: Language[]): Preferences => ({
  ...MOCK_PREFERENCES,
  goals: languages.map((language) => ({ ...MOCK_PREFERENCES.goals[0], language })),
});

beforeEach(() => {
  vi.clearAllMocks();
  repo.listAvailableLanguages.mockResolvedValue(["ru", "it", "es"]);
  repo.savePreferences.mockResolvedValue();
});

describe("savePreferences", () => {
  it("saves languages that have content sources", async () => {
    repo.getPreferences.mockResolvedValue(null);
    expect(await savePreferences(withGoals("ru", "es"))).toEqual({ ok: true, data: undefined });
    expect(repo.savePreferences).toHaveBeenCalledOnce();
  });

  it("refuses to add a language without sources, whatever the client sends", async () => {
    repo.getPreferences.mockResolvedValue(withGoals("ru"));
    expect(await savePreferences(withGoals("ru", "ko"))).toEqual({
      ok: false,
      error: "Aucune source de contenus n’est disponible pour : Coréen.",
    });
    expect(repo.savePreferences).not.toHaveBeenCalled();
  });

  it("keeps a language the user already studies even if it lost its sources", async () => {
    repo.getPreferences.mockResolvedValue(withGoals("ru", "ko"));
    expect((await savePreferences(withGoals("ru", "ko"))).ok).toBe(true);
    expect(repo.savePreferences).toHaveBeenCalledOnce();
  });
});

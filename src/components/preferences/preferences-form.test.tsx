// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_DEFAULTS } from "@/lib/domain/default-preferences";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import { PreferencesForm } from "./preferences-form";

const { replace, refresh, savePreferences } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  savePreferences: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/app/actions/preferences", () => ({ savePreferences }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const splitLine = () => screen.getByText(/^Russe \d+ min/).textContent;

describe("PreferencesForm", () => {
  it("shows the 20/10 split by default and updates it with the weights", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist={false} />);
    expect(splitLine()).toBe("Russe 20 min · Italien 10 min");

    const italianWeight = screen.getByRole("group", { name: "Poids Italien" });
    await user.click(italianWeight.querySelector("button[aria-label=Augmenter]")!);
    expect(splitLine()).toBe("Russe 15 min · Italien 15 min");
  });

  it("adds a third language and splits time across all of them", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Espagnol" }));
    expect(splitLine()).toBe("Russe 15 min · Italien 8 min · Espagnol 7 min");
    // A language already chosen is no longer offered.
    expect(screen.queryByRole("button", { name: "Espagnol" })).toBeNull();
  });

  it("only offers the languages that have content sources", () => {
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={["ru", "it", "es"]} persist={false} />);
    expect(screen.getByRole("button", { name: "Espagnol" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Coréen" })).toBeNull();
    expect(screen.queryByText(/Plus aucune source/)).toBeNull();
  });

  it("keeps a chosen language that lost its sources, with a warning", () => {
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={["ru"]} persist={false} />);
    expect(screen.getByRole("group", { name: "Poids Italien" })).toBeTruthy();
    expect(screen.getAllByText(/Plus aucune source de contenus/)).toHaveLength(1);
  });

  it("reports validation errors instead of saving", async () => {
    const user = userEvent.setup();
    const initial = { ...MOCK_PREFERENCES, goals: MOCK_PREFERENCES.goals.map((g) => ({ ...g, topics: ["culture" as const] })) };
    render(<PreferencesForm initial={initial} languages={LANGUAGE_CODES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "culture" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("Choisis au moins un sujet")).toBeTruthy();
  });

  it("confirms valid preferences", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText(/Préférences valides.*démonstration/)).toBeTruthy();
  });

  it("saves through the server action and reports success", async () => {
    savePreferences.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ dailyMinutes: 30 }));
    expect(await screen.findByText("Préférences enregistrées.")).toBeTruthy();
  });

  it("saves the chosen usage of a language", async () => {
    savePreferences.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist />);
    await user.selectOptions(screen.getAllByLabelText("Usage")[0], "professional");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        goals: [
          expect.objectContaining({ language: "ru", purpose: "professional" }),
          expect.objectContaining({ language: "it", purpose: "conversational" }),
        ],
      }),
    );
  });

  it("shows the server error when saving fails", async () => {
    savePreferences.mockResolvedValue({ ok: false, error: "Boom" });
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Boom")).toBeTruthy();
  });

  describe("topics and formats per language", () => {
    const [ru, italian] = MOCK_PREFERENCES.goals;
    const different = {
      ...MOCK_PREFERENCES,
      goals: [
        { ...ru, topics: ["économie" as const], contentTypes: ["article" as const] },
        { ...italian, topics: ["cinéma" as const, "gastronomie" as const], contentTypes: ["podcast" as const] },
      ],
    };
    const pressed = (name: string) =>
      Array.from(screen.getByRole("group", { name }).querySelectorAll("button[aria-pressed=true]")).map((b) => b.textContent);

    it("shows each language's own topics and formats, with the shortcut unchecked", () => {
      render(<PreferencesForm initial={different} languages={LANGUAGE_CODES} persist={false} />);
      expect(pressed("Sujets favoris Russe")).toEqual(["économie"]);
      expect(pressed("Sujets favoris Italien")).toEqual(["cinéma", "gastronomie"]);
      expect(pressed("Types de contenus Italien")).toEqual(["Podcast"]);
      const shortcut = screen.getByLabelText("Mêmes sujets et formats que Russe") as HTMLInputElement;
      expect(shortcut.checked).toBe(false);
    });

    it("has no shortcut on the first language, and checks it when values are equal", () => {
      render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist={false} />);
      expect(screen.getAllByLabelText(/Mêmes sujets et formats/)).toHaveLength(1);
      expect((screen.getByLabelText("Mêmes sujets et formats que Russe") as HTMLInputElement).checked).toBe(true);
      expect(screen.queryByRole("group", { name: "Sujets favoris Italien" })).toBeNull();
    });

    it("hides the pickers of a language that follows the first and copies its values on save", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist />);
      await user.click(screen.getByRole("button", { name: "sport" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      const saved = savePreferences.mock.calls[0][0] as typeof MOCK_PREFERENCES;
      expect(saved.goals[0].topics).toContain("sport");
      expect(saved.goals[1].topics).toEqual(saved.goals[0].topics);
      expect(saved.goals[1].contentTypes).toEqual(saved.goals[0].contentTypes);
    });

    it("unchecking the shortcut shows editable pickers", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist />);
      await user.click(screen.getByLabelText("Mêmes sujets et formats que Russe"));
      await user.click(within(screen.getByRole("group", { name: "Sujets favoris Italien" })).getByRole("button", { name: "sport" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      const saved = savePreferences.mock.calls[0][0] as typeof MOCK_PREFERENCES;
      expect(saved.goals[1].topics).toContain("sport");
      expect(saved.goals[0].topics).not.toContain("sport");
    });

    it("keeps different values when saving with the shortcut unchecked", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={different} languages={LANGUAGE_CODES} persist />);
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ goals: different.goals }));
    });

    it("adds a language with the shortcut checked and the first language's values", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={different} languages={LANGUAGE_CODES} persist />);
      await user.click(screen.getByRole("button", { name: "Espagnol" }));
      expect((screen.getAllByLabelText("Mêmes sujets et formats que Russe").at(-1) as HTMLInputElement).checked).toBe(true);
      expect(screen.queryByRole("group", { name: "Sujets favoris Espagnol" })).toBeNull();
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      const saved = savePreferences.mock.calls[0][0] as typeof MOCK_PREFERENCES;
      expect(saved.goals[2]).toMatchObject({ language: "es", topics: ["économie"], contentTypes: ["article"] });
    });
  });

  describe("first run (onboarding)", () => {
    it("starts without any language and refuses to continue until one is chosen", async () => {
      const user = userEvent.setup();
      render(<PreferencesForm initial={ONBOARDING_DEFAULTS} languages={LANGUAGE_CODES} mode="onboarding" persist />);
      expect(screen.getByText("Commence par choisir au moins une langue.")).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Commencer" }));
      expect(screen.getByText("Choisis au moins une langue")).toBeTruthy();
      expect(savePreferences).not.toHaveBeenCalled();
    });

    it("saves the chosen language and goes to the level test", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={ONBOARDING_DEFAULTS} languages={LANGUAGE_CODES} mode="onboarding" persist />);
      await user.click(screen.getByRole("button", { name: "Italien" }));
      await user.click(screen.getByRole("button", { name: "Commencer" }));
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          goals: [expect.objectContaining({ language: "it", topics: ["société", "culture"], contentTypes: ["article", "podcast"] })],
        }),
      );
      expect(replace).toHaveBeenCalledWith("/niveau?bienvenue=1");
    });
  });
});

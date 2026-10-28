// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_DEFAULTS } from "@/lib/domain/default-preferences";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import type { Preferences } from "@/lib/schemas/preferences";
import { PreferencesForm } from "./preferences-form";

const { replace, refresh, savePreferences } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  savePreferences: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/app/actions/preferences", () => ({ savePreferences }));

// The demo preferences work Italian on three days only; most tests want an even week.
const BASE: Preferences = {
  ...MOCK_PREFERENCES,
  goals: MOCK_PREFERENCES.goals.map((g) => ({ ...g, days: [1, 2, 3, 4, 5, 6, 7] })),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const splitLine = () => screen.getByText(/^Russe \d+ min/).textContent;

describe("PreferencesForm", () => {
  it("shows the minutes of each language and the total, and updates them by steps of 5", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
    expect(splitLine()).toBe("Russe 20 min · Italien 10 min");
    expect(screen.getByText("30 min par jour")).toBeTruthy();
    expect(screen.queryByText("Temps quotidien", { selector: "h2,p" })).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();

    const italian = screen.getByRole("group", { name: "Minutes par jour Italien" });
    expect(within(italian).getByText("10 min")).toBeTruthy();
    // The minimum is 10 minutes per language.
    expect((within(italian).getByRole("button", { name: "Diminuer" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(within(italian).getByRole("button", { name: "Augmenter" }));
    expect(within(italian).getByText("15 min")).toBeTruthy();
    expect(splitLine()).toBe("Russe 20 min · Italien 15 min");
    expect(screen.getByText("35 min par jour")).toBeTruthy();

    await user.click(within(italian).getByRole("button", { name: "Diminuer" }));
    expect(screen.getByText("30 min par jour")).toBeTruthy();
  });

  it("marks the language with the most minutes as the priority", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
    expect(screen.getAllByText("prioritaire")).toHaveLength(1);
    const italian = screen.getByRole("group", { name: "Minutes par jour Italien" });
    await user.click(within(italian).getByRole("button", { name: "Augmenter" }));
    await user.click(within(italian).getByRole("button", { name: "Augmenter" }));
    expect(screen.getAllByText("prioritaire")).toHaveLength(2);
  });

  it("fills the minutes with the presets", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Équilibré" }));
    expect(splitLine()).toBe("Russe 15 min · Italien 15 min");
    await user.click(screen.getByRole("button", { name: "Surtout Russe" }));
    expect(splitLine()).toBe("Russe 20 min · Italien 10 min");
    expect(screen.getByText("30 min par jour")).toBeTruthy();
  });

  it("offers no preset with a single language", () => {
    const single = { ...BASE, goals: [BASE.goals[0]] };
    render(<PreferencesForm initial={single} languages={LANGUAGE_CODES} persist={false} />);
    expect(screen.queryByRole("button", { name: "Équilibré" })).toBeNull();
  });

  it("refuses to save more than 120 minutes a day", async () => {
    const user = userEvent.setup();
    const over = {
      ...BASE,
      goals: [
        { ...BASE.goals[0], weight: 60 },
        { ...BASE.goals[1], weight: 60 },
      ],
    };
    render(<PreferencesForm initial={over} languages={LANGUAGE_CODES} persist />);
    await user.click(within(screen.getByRole("group", { name: "Minutes par jour Italien" })).getByRole("button", { name: "Augmenter" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("Au plus 120 minutes par jour au total")).toBeTruthy();
    expect(savePreferences).not.toHaveBeenCalled();
  });

  it("adds a third language with 15 minutes", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Espagnol" }));
    expect(splitLine()).toBe("Russe 20 min · Italien 10 min · Espagnol 15 min");
    expect(screen.getByText("45 min par jour")).toBeTruthy();
    // A language already chosen is no longer offered.
    expect(screen.queryByRole("button", { name: "Espagnol" })).toBeNull();
  });

  it("gives a first language added on first run 30 minutes", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={ONBOARDING_DEFAULTS} languages={LANGUAGE_CODES} mode="onboarding" persist={false} />);
    await user.click(screen.getByRole("button", { name: "Espagnol" }));
    expect(screen.getByText("30 min par jour")).toBeTruthy();
  });

  it("only offers the languages that have content sources", () => {
    render(<PreferencesForm initial={BASE} languages={["ru", "it", "es"]} persist={false} />);
    expect(screen.getByRole("button", { name: "Espagnol" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Coréen" })).toBeNull();
    expect(screen.queryByText(/Plus aucune source/)).toBeNull();
  });

  it("keeps a chosen language that lost its sources, with a warning", () => {
    render(<PreferencesForm initial={BASE} languages={["ru"]} persist={false} />);
    expect(screen.getByRole("group", { name: "Minutes par jour Italien" })).toBeTruthy();
    expect(screen.getAllByText(/Plus aucune source de contenus/)).toHaveLength(1);
  });

  it("reports validation errors instead of saving", async () => {
    const user = userEvent.setup();
    const initial = { ...BASE, goals: BASE.goals.map((g) => ({ ...g, topics: ["culture" as const] })) };
    render(<PreferencesForm initial={initial} languages={LANGUAGE_CODES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "culture" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("Choisis au moins un sujet")).toBeTruthy();
  });

  it("confirms valid preferences", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText(/Préférences valides.*démonstration/)).toBeTruthy();
  });

  it("saves through the server action and reports success", async () => {
    savePreferences.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ dailyMinutes: 30 }));
    expect(await screen.findByText("Préférences enregistrées.")).toBeTruthy();
  });

  it("saves the day streak preference, shown by default", async () => {
    savePreferences.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist />);
    const checkbox = screen.getByLabelText("Afficher ma série de jours") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText(/Aucun point, aucun classement/)).toBeTruthy();
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ showStreak: false }));
  });

  it("does not offer the streak choice on first run", () => {
    render(<PreferencesForm initial={ONBOARDING_DEFAULTS} languages={LANGUAGE_CODES} mode="onboarding" persist />);
    expect(screen.queryByLabelText("Afficher ma série de jours")).toBeNull();
  });

  it("saves the chosen usage of a language", async () => {
    savePreferences.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist />);
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
    render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Boom")).toBeTruthy();
  });

  describe("weekdays", () => {
    const chip = (day: string, language: string) => screen.getByRole("button", { name: `${day} ${language}` }) as HTMLButtonElement;
    const weekLines = () => Array.from(screen.getByRole("list", { name: "Semaine" }).querySelectorAll("li")).map((li) => li.textContent);

    it("shows seven day chips per language, all checked by default", () => {
      render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
      const group = screen.getByRole("group", { name: "Jours travaillés Italien" });
      const chips = within(group).getAllByRole("button");
      expect(chips.map((c) => c.textContent).join("")).toBe("LMMJVSD");
      expect(chips.every((c) => c.getAttribute("aria-pressed") === "true")).toBe(true);
    });

    it("starts new languages on every day", async () => {
      const user = userEvent.setup();
      render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
      await user.click(screen.getByRole("button", { name: "Espagnol" }));
      const group = screen.getByRole("group", { name: "Jours travaillés Espagnol" });
      expect(within(group).getAllByRole("button").every((c) => c.getAttribute("aria-pressed") === "true")).toBe(true);
    });

    it("toggles a day and lists the week, with rest days", async () => {
      const user = userEvent.setup();
      const single = { ...BASE, goals: [{ ...BASE.goals[0], days: [1, 2, 3, 4, 5, 6] }] };
      render(<PreferencesForm initial={single} languages={LANGUAGE_CODES} persist={false} />);
      expect(weekLines()).toContain("Dim : repos");
      expect(weekLines()).toContain("Lun : russe · 20 min");
      await user.click(chip("samedi", "Russe"));
      expect(chip("samedi", "Russe").getAttribute("aria-pressed")).toBe("false");
      expect(weekLines()).toContain("Sam : repos");
      await user.click(chip("dimanche", "Russe"));
      expect(weekLines()).toContain("Dim : russe · 20 min");
    });

    it("does not let the last checked day be removed", async () => {
      const user = userEvent.setup();
      const single = { ...BASE, goals: [{ ...BASE.goals[0], days: [3] }] };
      render(<PreferencesForm initial={single} languages={LANGUAGE_CODES} persist={false} />);
      expect(chip("mercredi", "Russe").disabled).toBe(true);
      await user.click(chip("mercredi", "Russe"));
      expect(chip("mercredi", "Russe").getAttribute("aria-pressed")).toBe("true");
      expect(weekLines().filter((l) => !l?.endsWith("repos"))).toEqual(["Mer : russe · 20 min"]);
    });

    it("sums the languages of each day and says au plus when the days differ", async () => {
      const user = userEvent.setup();
      render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist={false} />);
      // Russian every day (20), Italian on Monday, Wednesday and Friday (10).
      expect(weekLines()).toEqual([
        "Lun : russe, italien · 30 min",
        "Mar : russe · 20 min",
        "Mer : russe, italien · 30 min",
        "Jeu : russe · 20 min",
        "Ven : russe, italien · 30 min",
        "Sam : russe · 20 min",
        "Dim : russe · 20 min",
      ]);
      // "au plus" is a smaller span inside the total, so match the whole paragraph.
      const total = () => screen.getByText("30 min par jour").textContent;
      expect(total()).toBe("au plus 30 min par jour");
      // Italian on the other days too: every day alike again.
      for (const day of ["mardi", "jeudi", "samedi", "dimanche"]) await user.click(chip(day, "Italien"));
      expect(total()).toBe("30 min par jour");
      expect(weekLines()).toContain("Dim : russe, italien · 30 min");
    });

    it("saves the days and the busiest day's total", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={MOCK_PREFERENCES} languages={LANGUAGE_CODES} persist />);
      await user.click(chip("vendredi", "Italien"));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyMinutes: 30,
          goals: [
            expect.objectContaining({ language: "ru", days: [1, 2, 3, 4, 5, 6, 7] }),
            expect.objectContaining({ language: "it", days: [1, 3] }),
          ],
        }),
      );
    });

    it("accepts more than 120 minutes in total when they fall on different days", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      const split = {
        ...BASE,
        goals: [
          { ...BASE.goals[0], weight: 80, days: [1, 2, 3] },
          { ...BASE.goals[1], weight: 60, days: [4, 5, 6] },
        ],
      };
      render(<PreferencesForm initial={split} languages={LANGUAGE_CODES} persist />);
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ dailyMinutes: 80 }));
    });
  });

  describe("topics and formats per language", () => {
    const [ru, italian] = BASE.goals;
    const different = {
      ...BASE,
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
      render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist={false} />);
      expect(screen.getAllByLabelText(/Mêmes sujets et formats/)).toHaveLength(1);
      expect((screen.getByLabelText("Mêmes sujets et formats que Russe") as HTMLInputElement).checked).toBe(true);
      expect(screen.queryByRole("group", { name: "Sujets favoris Italien" })).toBeNull();
    });

    it("hides the pickers of a language that follows the first and copies its values on save", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist />);
      await user.click(screen.getByRole("button", { name: "sport" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      const saved = savePreferences.mock.calls[0][0] as typeof BASE;
      expect(saved.goals[0].topics).toContain("sport");
      expect(saved.goals[1].topics).toEqual(saved.goals[0].topics);
      expect(saved.goals[1].contentTypes).toEqual(saved.goals[0].contentTypes);
    });

    it("unchecking the shortcut shows editable pickers", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={BASE} languages={LANGUAGE_CODES} persist />);
      await user.click(screen.getByLabelText("Mêmes sujets et formats que Russe"));
      await user.click(within(screen.getByRole("group", { name: "Sujets favoris Italien" })).getByRole("button", { name: "sport" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      const saved = savePreferences.mock.calls[0][0] as typeof BASE;
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
      const saved = savePreferences.mock.calls[0][0] as typeof BASE;
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
          goals: [expect.objectContaining({ language: "it", topics: ["société", "culture"], contentTypes: ["article", "podcast", "video"] })],
        }),
      );
      expect(replace).toHaveBeenCalledWith("/niveau?bienvenue=1");
    });
  });
});

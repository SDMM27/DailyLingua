// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_DEFAULTS } from "@/lib/domain/default-preferences";
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
    render(<PreferencesForm initial={MOCK_PREFERENCES} persist={false} />);
    expect(splitLine()).toBe("Russe 20 min · Italien 10 min");

    const italianWeight = screen.getByRole("group", { name: "Poids Italien" });
    await user.click(italianWeight.querySelector("button[aria-label=Augmenter]")!);
    expect(splitLine()).toBe("Russe 15 min · Italien 15 min");
  });

  it("adds a third language and splits time across all of them", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Espagnol" }));
    expect(splitLine()).toBe("Russe 15 min · Italien 8 min · Espagnol 7 min");
    // A language already chosen is no longer offered.
    expect(screen.queryByRole("button", { name: "Espagnol" })).toBeNull();
  });

  it("reports validation errors instead of saving", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={{ ...MOCK_PREFERENCES, topics: ["culture"] }} persist={false} />);
    await user.click(screen.getByRole("button", { name: "culture" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("Choisis au moins un sujet")).toBeTruthy();
  });

  it("confirms valid preferences", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText(/Préférences valides.*démonstration/)).toBeTruthy();
  });

  it("saves through the server action and reports success", async () => {
    savePreferences.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} persist />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ dailyMinutes: 30 }));
    expect(await screen.findByText("Préférences enregistrées.")).toBeTruthy();
  });

  it("shows the server error when saving fails", async () => {
    savePreferences.mockResolvedValue({ ok: false, error: "Boom" });
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} persist />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Boom")).toBeTruthy();
  });

  describe("first run (onboarding)", () => {
    it("starts without any language and refuses to continue until one is chosen", async () => {
      const user = userEvent.setup();
      render(<PreferencesForm initial={ONBOARDING_DEFAULTS} mode="onboarding" persist />);
      expect(screen.getByText("Commence par choisir au moins une langue.")).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Commencer" }));
      expect(screen.getByText("Choisis au moins une langue")).toBeTruthy();
      expect(savePreferences).not.toHaveBeenCalled();
    });

    it("saves the chosen language and goes to the dashboard", async () => {
      savePreferences.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      render(<PreferencesForm initial={ONBOARDING_DEFAULTS} mode="onboarding" persist />);
      await user.click(screen.getByRole("button", { name: "Italien" }));
      await user.click(screen.getByRole("button", { name: "Commencer" }));
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ goals: [expect.objectContaining({ language: "it" })] }),
      );
      expect(replace).toHaveBeenCalledWith("/");
    });
  });
});

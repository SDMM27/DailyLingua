// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import { PreferencesForm } from "./preferences-form";

afterEach(cleanup);

const splitLine = () => screen.getByText(/^Russe \d+ min/).textContent;

describe("PreferencesForm", () => {
  it("shows the 20/10 split by default and updates it with the weights", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} />);
    expect(splitLine()).toBe("Russe 20 min · Italien 10 min");

    const italianWeight = screen.getByRole("group", { name: "Poids Italien" });
    await user.click(italianWeight.querySelector("button[aria-label=Augmenter]")!);
    expect(splitLine()).toBe("Russe 15 min · Italien 15 min");
  });

  it("adds a third language and splits time across all of them", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} />);
    await user.click(screen.getByRole("button", { name: "Espagnol" }));
    expect(splitLine()).toBe("Russe 15 min · Italien 8 min · Espagnol 7 min");
    // A language already chosen is no longer offered.
    expect(screen.queryByRole("button", { name: "Espagnol" })).toBeNull();
  });

  it("reports validation errors instead of saving", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={{ ...MOCK_PREFERENCES, topics: ["culture"] }} />);
    await user.click(screen.getByRole("button", { name: "culture" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("Choisis au moins un sujet")).toBeTruthy();
  });

  it("confirms valid preferences", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initial={MOCK_PREFERENCES} />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText(/Préférences valides/)).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CEFR_LEVELS } from "@/lib/schemas/common";
import type { PlacementItem, PlacementVariant } from "@/lib/schemas/placement";
import { PlacementTest } from "./placement-test";

const { push, refresh, completePlacementTest } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  completePlacementTest: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/app/actions/placement", () => ({ completePlacementTest }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** 3 questions per level; option 0 is right. Prompts: "<variant> <level> <n> ___". */
function fakeItems(letter: "e" | "p", label: string): PlacementItem[] {
  return CEFR_LEVELS.flatMap((level) =>
    [1, 2, 3].map((n) => ({
      id: `it-${letter}-${level.toLowerCase()}-${n}`,
      level,
      skill: "grammar" as const,
      prompt: `${label} ${level} ${n} ___`,
      options: [`${level}${n} juste`, `${level}${n} b`, `${level}${n} c`, `${level}${n} d`] as [
        string,
        string,
        string,
        string,
      ],
      answer: 0,
    })),
  );
}
const items: Record<PlacementVariant, PlacementItem[]> = {
  everyday: fakeItems("e", "Courant"),
  professional: fakeItems("p", "Pro"),
};

const setup = (props: Partial<Parameters<typeof PlacementTest>[0]> = {}) => {
  const user = userEvent.setup();
  render(
    <PlacementTest language="it" items={items} suggestedVariant="everyday" startLevel="B1" persist {...props} />,
  );
  return user;
};

describe("PlacementTest", () => {
  it("starts with the intro, the suggested variant preselected, and warns about the unknown answer", () => {
    setup({ suggestedVariant: "professional" });
    expect(screen.getByRole("radio", { name: /Pro/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /Courant/ }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/compte comme fausse/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Passer le test" }).getAttribute("href")).toBe("/niveau");
  });

  it("asks the questions of the chosen variant, at the starting level first, one at a time", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: /Pro/ }));
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    expect(screen.getByText("Question 1")).toBeTruthy();
    expect(screen.getByText(/Pro B1 1/)).toBeTruthy();
    expect(screen.getByRole("img", { name: "blanc à compléter" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /juste|\sb$|\sc$|\sd$/ })).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Arrêter" }).getAttribute("href")).toBe("/niveau");

    await user.click(screen.getByRole("button", { name: "B11 juste" }));
    expect(screen.getByText("Question 2")).toBeTruthy();
    expect(screen.getByText(/Pro B1 2/)).toBeTruthy();
  });

  it("goes to the result, lets the learner change the level and saves the answers", async () => {
    completePlacementTest.mockResolvedValue({ ok: true, data: { estimate: "B1", confidence: "high" } });
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    // B1 passed 2/2, B2 failed (wrong, then "I don't know").
    await user.click(screen.getByRole("button", { name: "B11 juste" }));
    await user.click(screen.getByRole("button", { name: "B12 juste" }));
    await user.click(screen.getByRole("button", { name: "B21 b" }));
    await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));

    expect(screen.getByText("Niveau estimé")).toBeTruthy();
    expect(screen.getByText("B1", { selector: "p" })).toBeTruthy();
    expect(screen.getByText(/Confiance élevée/)).toBeTruthy();
    expect(screen.getByText(/Niveau déclaré actuellement : B1/)).toBeTruthy();
    const select = screen.getByLabelText("Niveau à retenir") as HTMLSelectElement;
    expect(select.value).toBe("B1");

    await user.selectOptions(select, "B2");
    await user.click(screen.getByRole("button", { name: "Enregistrer ce niveau" }));
    expect(completePlacementTest).toHaveBeenCalledWith({
      language: "it",
      variant: "everyday",
      startLevel: "B1",
      answers: [
        { itemId: "it-e-b1-1", choice: 0 },
        { itemId: "it-e-b1-2", choice: 0 },
        { itemId: "it-e-b2-1", choice: 1 },
        { itemId: "it-e-b2-2", choice: null },
      ],
      chosenLevel: "B2",
    });
    expect(push).toHaveBeenCalledWith("/niveau");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the server error and stays on the result", async () => {
    completePlacementTest.mockResolvedValue({ ok: false, error: "Boom" });
    const user = setup({ startLevel: "A1" });
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer ce niveau" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Boom");
    expect(push).not.toHaveBeenCalled();
  });

  it("starts over from the result", async () => {
    const user = setup({ startLevel: "A1" });
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(screen.getByRole("button", { name: "Commencer" })).toBeTruthy();
  });

  it("does not save in the demo", async () => {
    const user = setup({ startLevel: "A1", persist: false });
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    expect(screen.getByText("Mode démonstration : rien n’est enregistré.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enregistrer ce niveau" })).toBeNull();
  });
});

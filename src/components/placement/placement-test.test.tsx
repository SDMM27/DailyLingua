// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFlatItems } from "@/lib/placement/testing";
import type { PlacementItem } from "@/lib/schemas/placement";
import { PlacementTest } from "./placement-test";

const { push, refresh, completePlacementTest, shuffle } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  completePlacementTest: vi.fn(),
  shuffle: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/app/actions/placement", () => ({ completePlacementTest }));
// Deterministic order (the bank order), with the calls recorded.
vi.mock("@/lib/domain/placement", async (orig) => ({
  ...(await orig<typeof import("@/lib/domain/placement")>()),
  shufflePlacementItems: shuffle,
}));

beforeEach(() => {
  shuffle.mockImplementation((list: PlacementItem[]) => [...list]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** 10 per level: 1-4 grammar, 5-7 vocabulary, 8-10 reading; the options are "a" to "d". */
const items = buildFlatItems("it");
const LETTERS = ["a", "b", "c", "d"];
/** A block of 5 is asked as grammar, vocabulary, reading, grammar, vocabulary: bank positions 1, 5, 8, 2, 6. */
const BLOCK = [1, 5, 8, 2, 6];

const find = (level: string, n: number) => items.find((i) => i.id === `it-${level.toLowerCase()}-${n}`)!;
const rightChoice = (level: string, n: number) => find(level, n).answer;
const wrongChoice = (level: string, n: number) => (find(level, n).answer + 1) % 4;
const choose = (user: ReturnType<typeof userEvent.setup>, choice: number) =>
  user.click(screen.getByRole("button", { name: LETTERS[choice] }));
const dontKnow = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Je ne sais pas" }));

const setup = (props: Partial<Parameters<typeof PlacementTest>[0]> = {}) => {
  const user = userEvent.setup();
  render(<PlacementTest language="it" items={items} startLevel="B1" persist {...props} />);
  return user;
};

describe("PlacementTest", () => {
  it("starts with the intro, no variant choice, and warns about the unknown answer", () => {
    setup();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByText(/compte comme fausse/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Passer le test" }).getAttribute("href")).toBe("/niveau");
    expect(shuffle).not.toHaveBeenCalled();
  });

  it("asks the questions at the starting level first, one at a time, with the progress", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    expect(shuffle).toHaveBeenCalledTimes(1);
    expect(shuffle).toHaveBeenCalledWith(items);
    expect(screen.getByText("Question 1 sur 30 max")).toBeTruthy();
    expect(screen.getByText(/B1 1$/)).toBeTruthy();
    expect(screen.getByRole("img", { name: "blanc à compléter" })).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByRole("link", { name: "Arrêter" }).getAttribute("href")).toBe("/niveau");

    await choose(user, rightChoice("B1", 1));
    expect(screen.getByText("Question 2 sur 30 max")).toBeTruthy();
    expect(screen.getByText(/B1 5$/)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  });

  it("goes to the result, lets the learner change the level and saves the answers", async () => {
    completePlacementTest.mockResolvedValue({ ok: true, data: { estimate: "B1", confidence: "high" } });
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    // B1 passed 5/5, then B2 failed: three wrong answers and two "Je ne sais pas".
    for (const n of BLOCK) await choose(user, rightChoice("B1", n));
    for (const n of BLOCK.slice(0, 3)) await choose(user, wrongChoice("B2", n));
    await dontKnow(user);
    await dontKnow(user);

    expect(screen.getByText("Niveau estimé")).toBeTruthy();
    expect(screen.getByText("B1", { selector: "p" })).toBeTruthy();
    expect(screen.getByText(/Niveau déclaré actuellement : B1/)).toBeTruthy();
    const select = screen.getByLabelText("Niveau à retenir") as HTMLSelectElement;
    expect(select.value).toBe("B1");

    await user.selectOptions(select, "B2");
    await user.click(screen.getByRole("button", { name: "Enregistrer ce niveau" }));
    expect(completePlacementTest).toHaveBeenCalledWith({
      language: "it",
      startLevel: "B1",
      answers: [
        ...BLOCK.map((n) => ({ itemId: `it-b1-${n}`, choice: rightChoice("B1", n) })),
        ...BLOCK.slice(0, 3).map((n) => ({ itemId: `it-b2-${n}`, choice: wrongChoice("B2", n) })),
        { itemId: "it-b2-2", choice: null },
        { itemId: "it-b2-6", choice: null },
      ],
      chosenLevel: "B2",
    });
    expect(push).toHaveBeenCalledWith("/niveau");
    expect(refresh).toHaveBeenCalled();
  });

  it("ends after one block of 5 from A1 when everything is wrong", async () => {
    const user = setup({ startLevel: "A1" });
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    for (let i = 0; i < 5; i += 1) await dontKnow(user);
    expect(screen.getByText("Niveau estimé")).toBeTruthy();
    expect(screen.getByText("A1", { selector: "p" })).toBeTruthy();
  });

  it("shows the server error and stays on the result", async () => {
    completePlacementTest.mockResolvedValue({ ok: false, error: "Boom" });
    const user = setup({ startLevel: "A1" });
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    for (let i = 0; i < 5; i += 1) await dontKnow(user);
    await user.click(screen.getByRole("button", { name: "Enregistrer ce niveau" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Boom");
    expect(screen.getByText("Niveau estimé")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("starts over from the result and draws the order again for a new test", async () => {
    const user = setup({ startLevel: "A1" });
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    for (let i = 0; i < 5; i += 1) await dontKnow(user);
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(shuffle).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    expect(shuffle).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Question 1 sur 30 max")).toBeTruthy();
  });

  it("does not save in the demo", async () => {
    const user = setup({ startLevel: "A1", persist: false });
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    for (let i = 0; i < 5; i += 1) await dontKnow(user);
    expect(screen.getByText("Mode démonstration : rien n’est enregistré.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enregistrer ce niveau" })).toBeNull();
  });
});

describe("PlacementTest alphabet note", () => {
  it("points to the alphabet and its reading check when the script is not mastered", () => {
    setup({ language: "ru", alphabet: { script: "cyrillic" } });
    expect(screen.getByText(/Tu ne lis pas encore le cyrillique/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Commence par l’alphabet." }).getAttribute("href")).toBe("/alphabet?langue=ru");
    expect(screen.getByRole("link", { name: "Vérifie-le en 10 mots." }).getAttribute("href")).toBe("/alphabet/ru/test");
  });

  it("says nothing about the alphabet otherwise", () => {
    setup();
    expect(screen.queryByText(/Tu ne lis pas encore/)).toBeNull();
  });
});

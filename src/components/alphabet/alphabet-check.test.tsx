// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AlphabetExercise } from "@/lib/schemas/alphabet";
import { AlphabetCheck } from "./alphabet-check";

const actions = vi.hoisted(() => ({ recordAlphabetCheck: vi.fn() }));
vi.mock("@/app/actions/alphabet", () => actions);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DAY = "2026-10-21";

// Ten words, each with its right answer first in `options` (index 0) for simplicity.
const EXERCISES: AlphabetExercise[] = Array.from({ length: 10 }, (_, i) => ({
  type: "read-word" as const,
  word: `слово${i}`,
  options: [`ok${i}`, `a${i}`, `b${i}`, `c${i}`],
  answer: 0,
}));

function setup(props: Partial<Parameters<typeof AlphabetCheck>[0]> = {}) {
  const user = userEvent.setup();
  render(
    <AlphabetCheck
      exercises={EXERCISES}
      day={DAY}
      language="ru"
      script="cyrillic"
      firstGroupId="ru-alphabet-1"
      persist
      {...props}
    />,
  );
  return user;
}

/** Answers every question; `wrong` is how many of the first ones get a wrong answer. */
async function run(user: ReturnType<typeof userEvent.setup>, wrong = 0, skip = 0) {
  await user.click(screen.getByRole("button", { name: "Commencer le test" }));
  for (let i = 0; i < EXERCISES.length; i++) {
    if (i < skip) await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    else await user.click(screen.getByRole("button", { name: i < skip + wrong ? `a${i}` : `ok${i}` }));
  }
}

describe("AlphabetCheck", () => {
  it("introduces the check, then asks one word at a time with no verdict", async () => {
    const user = setup();
    expect(screen.getByText(/Tu lis déjà le cyrillique/)).toBeTruthy();
    expect(screen.getByText(/10 mots à lire, il en faut 9 justes/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Commencer le test" }));

    expect(screen.getByText("1 / 10")).toBeTruthy();
    expect(screen.getByText("слово0").getAttribute("lang")).toBe("ru");
    const options = screen.getByRole("group", { name: "Choisis la bonne réponse" }).querySelectorAll("button");
    expect([...options].every((b) => b.className.includes("min-h-14"))).toBe(true);

    await user.click(screen.getByRole("button", { name: "a0" }));
    // Straight to the next question: no right/wrong feedback.
    expect(screen.queryByText(/Juste|Pas tout à fait|Bonne réponse/)).toBeNull();
    expect(screen.getByText("2 / 10")).toBeTruthy();
  });

  it("sends the choices (null for « Je ne sais pas ») and congratulates a pass", async () => {
    actions.recordAlphabetCheck.mockResolvedValue({ ok: true, data: { correct: 9, total: 10, passed: true, marked: 5 } });
    const user = setup();
    await run(user, 0, 1);
    expect(actions.recordAlphabetCheck).toHaveBeenCalledWith({
      language: "ru",
      day: DAY,
      choices: [null, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    expect(await screen.findByText("9 / 10")).toBeTruthy();
    expect(screen.getByText("Alphabet validé : tous les groupes sont marqués comme maîtrisés.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voir mon alphabet" }).getAttribute("href")).toBe("/alphabet?langue=ru");
  });

  it("sends a failed check to the first group", async () => {
    actions.recordAlphabetCheck.mockResolvedValue({ ok: true, data: { correct: 8, total: 10, passed: false, marked: 0 } });
    const user = setup();
    await run(user, 2);
    expect(await screen.findByText(/Pas encore : commence par le premier groupe/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Commencer par le premier groupe" }).getAttribute("href")).toBe(
      "/alphabet/ru/ru-alphabet-1",
    );
  });

  it("shows the message of the server when the save is refused, and can start again", async () => {
    actions.recordAlphabetCheck.mockResolvedValue({ ok: false, error: "Ce test a expiré : recharge la page." });
    const user = setup();
    await run(user);
    expect((await screen.findByRole("alert")).textContent).toContain("Ce test a expiré");
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(screen.getByRole("button", { name: "Commencer le test" })).toBeTruthy();
  });

  it("saves nothing in the demo", async () => {
    const user = setup({ persist: false });
    await run(user);
    expect(actions.recordAlphabetCheck).not.toHaveBeenCalled();
    expect(screen.getByText("10 / 10")).toBeTruthy();
    expect(screen.getByText(/Mode démonstration.*rien n’est enregistré\./)).toBeTruthy();
  });
});
